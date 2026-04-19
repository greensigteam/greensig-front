import type { FC } from 'react';
import { Sparkles, MapPin, TreePine, CheckCircle2 } from 'lucide-react';

export type Step = 'type' | 'site' | 'objects' | 'details';

const StepIndicator: FC<{ currentStep: Step; completedSteps: Step[] }> = ({
  currentStep,
  completedSteps,
}) => {
  const steps = [
    { id: 'type' as Step, label: 'Type de tâche', icon: Sparkles },
    { id: 'site' as Step, label: 'Site', icon: MapPin },
    { id: 'objects' as Step, label: 'Objets', icon: TreePine },
    { id: 'details' as Step, label: 'Finalisation', icon: CheckCircle2 },
  ];

  const getStepIndex = (step: Step) => steps.findIndex((s) => s.id === step);
  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 flex-shrink-0">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = step.id === currentStep;
        const isUpcoming = index > currentIndex;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div
                className={`
                                relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300
                                ${isCompleted ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : ''}
                                ${isCurrent ? 'bg-white text-emerald-600 shadow-md ring-3 ring-emerald-100' : ''}
                                ${isUpcoming ? 'bg-gray-200 text-gray-400' : ''}
                            `}
              >
                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="flex flex-col">
                <span
                  className={`text-xs font-medium transition-colors ${isCurrent ? 'text-emerald-700' : isCompleted ? 'text-emerald-600' : 'text-gray-400'}`}
                >
                  {step.label}
                </span>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-3 transition-all duration-300 ${isCompleted ? 'bg-emerald-600' : 'bg-gray-200'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator;
