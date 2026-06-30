/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { ONBOARDING_STEPS } from "../../constants";
import { useAuth } from "../../store/hooks";

/** Full-screen onboarding walkthrough overlay. */
export const OnboardingOverlay = () => {
  const { onboardingStep, setOnboardingStep, completeOnboarding } = useAuth();

  return (
    <AnimatePresence>
      {onboardingStep !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Onboarding tutorial"
          className="absolute inset-0 z-[100] flex items-center justify-center p-8 text-center safe-top safe-bottom"
        >
          <div className="absolute inset-0 bg-brand-primary/90 backdrop-blur-md" />
          <div className="max-w-xs relative z-10">
            <motion.div
              key={onboardingStep}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
            >
              <div className="bg-white p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-8 shadow-xl">
                {ONBOARDING_STEPS[onboardingStep].icon}
              </div>
              <h2 className="text-3xl font-black text-white mb-4">
                {ONBOARDING_STEPS[onboardingStep].title}
              </h2>
              <p className="text-white/90 font-medium mb-12 text-base">
                {ONBOARDING_STEPS[onboardingStep].description}
              </p>

              <div className="flex gap-4">
                {onboardingStep > 0 && (
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(onboardingStep - 1)}
                    className="flex-1 py-4 min-h-[52px] bg-white/10 text-white rounded-2xl font-black text-lg border-2 border-white/20"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (onboardingStep < ONBOARDING_STEPS.length - 1) {
                      setOnboardingStep(onboardingStep + 1);
                    } else {
                      completeOnboarding();
                    }
                  }}
                  className="flex-[2] py-4 min-h-[52px] bg-white text-brand-primary rounded-2xl font-black text-lg shadow-xl"
                >
                  {onboardingStep === ONBOARDING_STEPS.length - 1
                    ? "Let's Go!"
                    : "Next"}
                </button>
              </div>

              <button
                type="button"
                onClick={completeOnboarding}
                className="mt-8 min-h-[44px] text-white/70 text-xs font-bold uppercase tracking-widest"
              >
                Skip Tutorial
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
