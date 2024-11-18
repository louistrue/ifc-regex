'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { EnhancedIFCParser, IFCElement } from '@/lib/EnhancedIFCParser';
import ClusterControls from '@/components/ClusterControls';
import ForceGraph from '@/components/ForceGraph';

type ClusteringMode = 'none' | 'type' | 'level' | 'material' | 'connections';

type EntityNode = {
  id: string;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  connections: string[];
  color: string;
  size: number;
  opacity: number;
  label: string;
  discovered: boolean;
  level?: string;
  material?: string;
  targetX?: number;
  targetY?: number;
};

export default function Home() {
  const [entities, setEntities] = useState<Map<string, EntityNode>>(new Map());
  const [stats, setStats] = useState<{ [key: string]: number }>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isFileHovered, setIsFileHovered] = useState(false);

  // Color palette for different entity types
  const colorMap: { [key: string]: string } = {
    IFCWALL: '#00ffd5',
    IFCSLAB: '#7d95ff',
    IFCWINDOW: '#45B7D1',
    IFCDOOR: '#96CEB4',
    IFCBEAM: '#ffcc66',
    IFCCOLUMN: '#ff69b4',
    IFCBUILDINGSTOREY: '#9B59B6',
    IFCMATERIAL: '#F1C40F'
  };

  const allowedTypes = [
    'IFCWALL',
    'IFCWALLSTANDARDCASE',
    'IFCSLAB',
    'IFCWINDOW',
    'IFCDOOR',
    'IFCBEAM',
    'IFCCOLUMN',
    'IFCBUILDINGSTOREY',
    'IFCMATERIAL'
  ];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnimating(true);
    setCurrentPhase('PARSING FILE');

    const content = await file.text();
    const parser = new EnhancedIFCParser();
    const result = parser.parse(content);

    if (result) {
      // Filter and transform elements
      const filteredElements = new Map();
      const newStats: { [key: string]: number } = {};

      result.elements.forEach((element, id) => {
        if (allowedTypes.includes(element.type)) {
          filteredElements.set(id, {
            id,
            type: element.type,
            level: element.storey?.name || '',
            material: element.materials[0]?.name || '',
            connections: element.connections.filter(connId => {
              const connectedElement = result.elements.get(connId);
              return connectedElement && allowedTypes.includes(connectedElement.type);
            })
          });

          newStats[element.type] = (newStats[element.type] || 0) + 1;
        }
      });

      setEntities(filteredElements);
      setStats(newStats);
      setCurrentPhase('VISUALIZATION READY');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden font-mono">
      {/* Background Grid */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(#1e90ff 1px, transparent 1px), linear-gradient(90deg, #1e90ff 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}
      />

      {/* Main Content */}
      <div className="relative z-10">
        {!isAnimating ? (
          <div className="min-h-screen flex items-center justify-center">
            <div 
              className={`
                p-1 rounded-2xl
                ${isFileHovered ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-gradient-to-r from-gray-800 to-gray-700'}
                transition-all duration-300
              `}
            >
              <div 
                className="bg-black rounded-xl p-12 relative overflow-hidden"
                onDragEnter={() => setIsFileHovered(true)}
                onDragLeave={() => setIsFileHovered(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsFileHovered(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileUpload({ target: { files: [file] } } as any);
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="relative z-10 space-y-6">
                  <div className="text-center space-y-2">
                    <h1 className="text-4xl font-light tracking-wider bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                      Ifc Explorer 3000
                    </h1>
                    <p className="text-gray-400 text-sm tracking-wide">
                      just a fancy (some might say stupid) way to look at Ifc files...
                    </p>
                  </div>

                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                      <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <label className="cursor-pointer group">
                      <input
                        type="file"
                        accept=".ifc"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <span className="text-sm text-gray-400 group-hover:text-white transition-colors">
                        DROP IFC FILE OR CLICK TO SELECT
                      </span>
                      
                      <div className="h-2"></div>
                    </label>
                    <span className="text-xs text-gray-600 group-hover:text-white transition-colors">
                      No backend, no server, no worries. Your Ifc file is processed in the browser, and no data is sent anywhere.
                    </span>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 blur-2xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-500/10 to-pink-500/10 blur-2xl" />
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-screen relative">
            {/* Visualization */}
            <div className="absolute inset-0">
              <ForceGraph
                nodes={Array.from(entities.values()).map(entity => ({
                  id: entity.id,
                  type: entity.type,
                  level: entity.level,
                  material: entity.material,
                  connections: entity.connections
                }))}
                selectedType={selectedType}
                colorMap={colorMap}
                onNodeSelect={setSelectedNode}
              />
            </div>

            {/* HUD Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top Bar */}
              <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black to-transparent p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-gray-400">STATUS:</span>
                    <span className="ml-2 text-cyan-400">{currentPhase}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400">ENTITIES:</span>
                    <span className="ml-2 text-cyan-400">{entities.size}</span>
                  </div>
                </div>
              </div>

              {/* Stats Panel */}
              {Object.keys(stats).length > 0 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-xl rounded-lg border border-gray-800 p-4 max-w-3xl w-full mx-auto pointer-events-auto">
                  <div className="max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    <div className="flex flex-wrap gap-4 justify-center">
                      {Object.entries(stats).map(([type, count]) => (
                        <button
                          key={type}
                          onClick={() => setSelectedType(selectedType === type ? null : type)}
                          className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300
                            ${selectedType === type 
                              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 scale-105' 
                              : 'hover:bg-white/5'
                            }
                          `}
                        >
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: colorMap[type] }}
                          />
                          <span className="text-sm text-gray-400">{type.replace('IFC', '')}</span>
                          <span 
                            className="text-lg font-light" 
                            style={{ color: colorMap[type] }}
                          >
                            {count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Selected Node Info */}
              {selectedNode && (
                <div className="absolute top-20 left-4 w-64 bg-black/80 backdrop-blur-xl rounded-lg border border-gray-800 p-4">
                  <div className="space-y-4">
                    <div className="text-xs text-gray-400 uppercase tracking-wider">Selected Entity</div>
                    <div className="space-y-2">
                      <div className="text-sm text-white">{selectedNode}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
