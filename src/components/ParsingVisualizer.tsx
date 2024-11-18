import { useEffect, useState } from 'react';

type ParsingStep = {
  type: 'entity' | 'relationship' | 'complete';
  message: string;
  data?: any;
};

export function ParsingVisualizer({ steps }: { steps: ParsingStep[] }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep < steps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentStep, steps.length]);

  return (
    <div className="space-y-4">
      <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        />
      </div>

      <div className="space-y-2">
        {steps.slice(0, currentStep + 1).map((step, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg transition-opacity duration-300 ${
              index === currentStep ? 'bg-blue-600/20' : 'bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                step.type === 'entity' ? 'bg-green-400' :
                step.type === 'relationship' ? 'bg-purple-400' :
                'bg-blue-400'
              }`} />
              <span className="text-sm text-gray-300">{step.message}</span>
            </div>
            {step.data && (
              <pre className="mt-2 text-xs text-gray-400 overflow-x-auto">
                {JSON.stringify(step.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
