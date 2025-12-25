import React, { type FC } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { MODAL_DESIGN_TOKENS } from './designTokens';

// ============================================================================
// TYPES
// ============================================================================

export interface Step {
  /** Unique identifier for the step */
  id: string;
  /** Display label */
  label: string;
  /** Icon component */
  icon: React.ComponentType<{ className?: string }>;
}

export interface StepIndicatorProps {
  /** List of steps to display */
  steps: Step[];
  /** Current active step ID */
  currentStep: string;
  /** List of completed step IDs */
  completedSteps: string[];
  /** Optional class name for container */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * StepIndicator Component
 *
 * Displays a horizontal progress indicator for multi-step workflows.
 * Extracted from QuickTaskCreator.tsx and made reusable.
 *
 * Features:
 * - Visual states: completed (emerald), current (white + ring), upcoming (gray)
 * - Connecting lines between steps
 * - Smooth transitions
 * - Gradient background
 *
 * @example
 * ```tsx
 * const steps = [
 *   { id: 'info', label: 'Information', icon: Info },
 *   { id: 'details', label: 'Details', icon: Edit },
 *   { id: 'review', label: 'Review', icon: Check }
 * ];
 *
 * <StepIndicator
 *   steps={steps}
 *   currentStep="details"
 *   completedSteps={['info']}
 * />
 * ```
 */
export const StepIndicator: FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  completedSteps,
  className = '',
}) => {
  const getStepIndex = (stepId: string) => steps.findIndex(s => s.id === stepId);
  const currentIndex = getStepIndex(currentStep);

  return (
    <div
      className={`flex items-center justify-between ${MODAL_DESIGN_TOKENS.spacing.headerPadding} ${MODAL_DESIGN_TOKENS.stepIndicator.containerGradient} border-b flex-shrink-0 ${className}`}
    >
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = step.id === currentStep;
        const isUpcoming = index > currentIndex;
        const Icon = step.icon;

        // Determine circle style based on state
        let circleStyle = '';
        if (isCompleted) {
          circleStyle = MODAL_DESIGN_TOKENS.stepIndicator.completed;
        } else if (isCurrent) {
          circleStyle = MODAL_DESIGN_TOKENS.stepIndicator.current;
        } else if (isUpcoming) {
          circleStyle = MODAL_DESIGN_TOKENS.stepIndicator.upcoming;
        }

        // Determine label color based on state
        let labelColor = '';
        if (isCurrent) {
          labelColor = MODAL_DESIGN_TOKENS.colors.text.emeraldDark;
        } else if (isCompleted) {
          labelColor = MODAL_DESIGN_TOKENS.colors.text.emerald;
        } else {
          labelColor = MODAL_DESIGN_TOKENS.colors.text.tertiary;
        }

        return (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step circle + label */}
            <div className="flex items-center gap-2 flex-1">
              {/* Circle with icon */}
              <div
                className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${circleStyle}`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>

              {/* Label */}
              <div className="flex flex-col">
                <span className={`text-xs font-medium transition-colors ${labelColor}`}>
                  {step.label}
                </span>
              </div>
            </div>

            {/* Connector line (except after last step) */}
            {index < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-3 transition-all duration-300 ${
                  isCompleted
                    ? MODAL_DESIGN_TOKENS.stepIndicator.connectorCompleted
                    : MODAL_DESIGN_TOKENS.stepIndicator.connectorUpcoming
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator;
