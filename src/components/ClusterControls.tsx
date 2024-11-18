import React from 'react';

interface ClusterControlsProps {
  types: string[];
  selectedType: string | null;
  onTypeSelect: (type: string | null) => void;
  colorMap: { [key: string]: string };
}

const ClusterControls: React.FC<ClusterControlsProps> = ({
  types,
  selectedType,
  onTypeSelect,
  colorMap
}) => {
  const getFunName = (type: string) => {
    // Fun names for IFC types
    const funNames: { [key: string]: string } = {
      'IFCWALL': '🧱 Walls (they hold stuff up)',
      'IFCWINDOW': '🪟 Windows (for sneaking peeks)',
      'IFCDOOR': '🚪 Doors (dramatic exits)',
      'IFCSLAB': '🛹 Slabs (fancy floors)',
      'IFCBEAM': '💪 Beams (the muscle)',
      'IFCCOLUMN': '🗿 Columns (standing tall)',
      'IFCSTAIR': '🪜 Stairs (up we go!)',
      'IFCROOF': '🏠 Roofs (rain blockers)',
      'IFCFURNISHINGELEMENT': '🛋️ Furniture (comfy stuff)',
      'IFCBUILDINGSTOREY': '🎂 Stories (like cake layers)',
      'IFCSPACE': '✨ Spaces (where magic happens)',
      'IFCWALLSTANDARDCASE': '🧱 More Walls (the basic ones)',
      'IFCRAILING': '🎢 Railings (don\'t fall!)',
      'IFCMEMBER': '🏗️ Members (supporting actors)',
      'IFCPLATE': '🍽️ Plates (not for eating)',
      'IFCCOVERING': '🎭 Coverings (fancy dress)',
      'IFCFOOTING': '🦶 Footings (building feet)',
      'IFCCURTAINWALL': '🎪 Curtain Walls (glass party)',
    };
    return funNames[type] || type.replace('IFC', '');
  };

  return (
    <div className="fixed top-4 right-4 bg-black/30 backdrop-blur-lg p-4 rounded-xl shadow-2xl w-64 border border-white/10">
      <h2 className="text-white/90 text-lg font-medium mb-3">✨ Building Blocks</h2>
      <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
        {types.map(type => (
          <button
            key={type}
            onClick={() => onTypeSelect(selectedType === type ? null : type)}
            className={`
              w-full text-left px-3 py-2 rounded-lg 
              transition-all duration-500 ease-out
              hover:scale-[1.02] hover:shadow-lg
              ${selectedType === type 
                ? 'bg-white/20 shadow-lg scale-[1.02]' 
                : 'bg-white/5 hover:bg-white/10'
              }
            `}
            style={{
              borderLeft: `4px solid ${colorMap[type] || '#666'}`
            }}
          >
            <div className="text-white/90 text-sm font-medium">
              {getFunName(type)}
            </div>
            <div className="text-white/50 text-xs">
              {selectedType === type ? '🎯 In the spotlight' : '👆 Click me!'}
            </div>
          </button>
        ))}
      </div>
      {selectedType && (
        <button
          onClick={() => onTypeSelect(null)}
          className="mt-4 w-full px-3 py-2 bg-white/10 hover:bg-white/20 
                     rounded-lg text-white/70 text-sm transition-all duration-300
                     hover:scale-[1.02]"
        >
          🎪 Show everyone again
        </button>
      )}
    </div>
  );
};

export default ClusterControls;
