export class IFCElement {
  id: string;
  type: string;
  attributes: {
    globalId: string;
    name: string;
    description: string;
  };
  storey: IFCLevel | null;
  materials: IFCMaterial[];
  properties: Map<string, any>;
  connections: string[];

  constructor(id: string, type: string, attributes = {}) {
    this.id = id;
    this.type = type;
    this.attributes = attributes;
    this.storey = null;
    this.materials = [];
    this.properties = new Map();
    this.connections = [];
  }
}

export class IFCLevel {
  id: string;
  name: string;
  elevation: number;
  elements: Set<string>;

  constructor(id: string, name: string, elevation: number) {
    this.id = id;
    this.name = name;
    this.elevation = elevation;
    this.elements = new Set();
  }
}

export class IFCMaterial {
  id: string;
  name: string;
  properties: Record<string, any>;

  constructor(id: string, name: string, properties = {}) {
    this.id = id;
    this.name = name;
    this.properties = properties;
  }
}

export class EnhancedIFCParser {
  elements: Map<string, IFCElement>;
  levels: Map<string, IFCLevel>;
  materials: Map<string, IFCMaterial>;
  relationships: Map<string, { type: string; parameters: any[] }>;
  elementsByType: Map<string, Set<string>>;
  patterns: {
    entity: RegExp;
    reference: RegExp;
    string: RegExp;
    number: RegExp;
    data: RegExp;
  };

  constructor() {
    this.elements = new Map();
    this.levels = new Map();
    this.materials = new Map();
    this.relationships = new Map();
    this.elementsByType = new Map();
    
    this.patterns = {
      entity: /#(\d+)=([A-Z]+)\((.*)\);/g,
      reference: /#\d+/g,
      string: /'([^']+)'/g,
      number: /-?\d+\.?\d*(?:E-?\d+)?/g,
      data: /DATA;(.*?)ENDSEC;/s
    };
  }

  parse(ifcContent: string) {
    this.clear();
    const dataMatch = ifcContent.match(this.patterns.data);
    if (!dataMatch) return null;

    const dataSection = dataMatch[1];
    let match;

    // First pass: Create all entities
    while ((match = this.patterns.entity.exec(dataSection)) !== null) {
      const [_, id, type, params] = match;
      const parameters = this.parseParameters(params);

      switch(type) {
        case 'IFCBUILDINGSTOREY':
          this.createLevel(id, parameters);
          break;
        
        case 'IFCWALL':
        case 'IFCWALLSTANDARDCASE':
        case 'IFCSLAB':
        case 'IFCWINDOW':
        case 'IFCDOOR':
        case 'IFCBEAM':
        case 'IFCCOLUMN':
          this.createElement(id, type, parameters);
          break;

        case 'IFCMATERIAL':
          this.createMaterial(id, parameters);
          break;

        case 'IFCRELCONTAINEDINSPATIALSTRUCTURE':
        case 'IFCRELDEFINESBYPROPERTIES':
        case 'IFCRELASSOCIATESMATERIAL':
        case 'IFCRELCONNECTSPATHELEMENTS':
          this.relationships.set(id, { type, parameters });
          break;
      }
    }

    // Second pass: Process relationships
    for (const [id, rel] of this.relationships) {
      switch(rel.type) {
        case 'IFCRELCONTAINEDINSPATIALSTRUCTURE':
          this.processContainment(rel.parameters);
          break;
        
        case 'IFCRELASSOCIATESMATERIAL':
          this.processMaterialAssignment(rel.parameters);
          break;
        
        case 'IFCRELCONNECTSPATHELEMENTS':
          this.processConnections(rel.parameters);
          break;
      }
    }

    return {
      elements: this.elements,
      levels: this.levels,
      materials: this.materials,
      elementsByType: this.elementsByType
    };
  }

  private clear() {
    this.elements.clear();
    this.levels.clear();
    this.materials.clear();
    this.relationships.clear();
    this.elementsByType.clear();
  }

  private createElement(id: string, type: string, parameters: any[]) {
    const attributes = {
      globalId: this.extractValue(parameters[0]),
      name: this.extractValue(parameters[2]) || '',
      description: this.extractValue(parameters[3]) || ''
    };

    const element = new IFCElement(id, type, attributes);
    this.elements.set(id, element);

    if (!this.elementsByType.has(type)) {
      this.elementsByType.set(type, new Set());
    }
    this.elementsByType.get(type)?.add(id);
  }

  private createLevel(id: string, parameters: any[]) {
    const name = this.extractValue(parameters[2]) || '';
    const elevation = Number(this.extractValue(parameters[9])) || 0;
    
    const level = new IFCLevel(id, name, elevation);
    this.levels.set(id, level);
  }

  private createMaterial(id: string, parameters: any[]) {
    const name = this.extractValue(parameters[0]) || '';
    const material = new IFCMaterial(id, name);
    this.materials.set(id, material);
  }

  private processContainment(parameters: any[]) {
    const relatedElements = this.extractReferences(parameters[4]);
    const storey = this.extractReference(parameters[5]);
    
    if (storey && this.levels.has(storey)) {
      const level = this.levels.get(storey)!;
      relatedElements.forEach(elementId => {
        if (this.elements.has(elementId)) {
          const element = this.elements.get(elementId)!;
          element.storey = level;
          level.elements.add(elementId);
        }
      });
    }
  }

  private processMaterialAssignment(parameters: any[]) {
    const relatedElements = this.extractReferences(parameters[4]);
    const materialRef = this.extractReference(parameters[5]);
    
    if (materialRef && this.materials.has(materialRef)) {
      const material = this.materials.get(materialRef)!;
      relatedElements.forEach(elementId => {
        if (this.elements.has(elementId)) {
          const element = this.elements.get(elementId)!;
          element.materials.push(material);
        }
      });
    }
  }

  private processConnections(parameters: any[]) {
    const element1 = this.extractReference(parameters[4]);
    const element2 = this.extractReference(parameters[5]);
    
    if (element1 && element2) {
      if (this.elements.has(element1)) {
        this.elements.get(element1)!.connections.push(element2);
      }
      if (this.elements.has(element2)) {
        this.elements.get(element2)!.connections.push(element1);
      }
    }
  }

  private parseParameters(paramString: string): any[] {
    const params = [];
    let currentParam = '';
    let depth = 0;
    
    for (let i = 0; i < paramString.length; i++) {
      const char = paramString[i];
      
      if (char === '(' && depth === 0) {
        depth++;
        continue;
      }
      
      if (char === ')' && depth === 1) {
        if (currentParam) params.push(this.parseValue(currentParam));
        break;
      }
      
      if (char === ',' && depth === 0) {
        if (currentParam) params.push(this.parseValue(currentParam));
        currentParam = '';
        continue;
      }
      
      if (char === '(') depth++;
      if (char === ')') depth--;
      
      currentParam += char;
    }
    
    return params;
  }

  private parseValue(value: string): any {
    value = value.trim();
    
    // Handle empty/null values
    if (value === '$' || value === '*') return null;
    
    // Handle strings
    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1);
    }
    
    // Handle references
    if (value.startsWith('#')) {
      return value.slice(1);
    }
    
    // Handle numbers
    if (!isNaN(Number(value))) {
      return Number(value);
    }
    
    return value;
  }

  private extractValue(param: any): string | null {
    if (!param) return null;
    return String(param);
  }

  private extractReferences(param: any): string[] {
    if (!param) return [];
    if (typeof param === 'string' && param.startsWith('#')) {
      return [param.slice(1)];
    }
    if (Array.isArray(param)) {
      return param
        .filter(p => p && typeof p === 'string' && p.startsWith('#'))
        .map(p => p.slice(1));
    }
    return [];
  }

  private extractReference(param: any): string | null {
    if (!param || typeof param !== 'string' || !param.startsWith('#')) return null;
    return param.slice(1);
  }

  getElementsByType(type: string): IFCElement[] {
    const elementIds = this.elementsByType.get(type) || new Set();
    return Array.from(elementIds).map(id => this.elements.get(id)!);
  }

  getElementsByLevel(levelName: string): IFCElement[] {
    const level = Array.from(this.levels.values()).find(l => l.name === levelName);
    if (!level) return [];
    return Array.from(level.elements).map(id => this.elements.get(id)!);
  }

  getElementsByMaterial(materialName: string): IFCElement[] {
    return Array.from(this.elements.values()).filter(element => 
      element.materials.some(mat => mat.name === materialName)
    );
  }
}

export type ParsedIFCModel = {
  elements: Map<string, IFCElement>;
  levels: Map<string, IFCLevel>;
  materials: Map<string, IFCMaterial>;
  elementsByType: Map<string, Set<string>>;
};
