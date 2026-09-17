import { CONDITIONS, EVENT_TYPES, DAYS, inputClasses, labelClasses } from './ruleFormConstants';


export default function RuleConditionFields({
  conditionType,
  params,
  error,
  name,
  fleetGroupId,
  fleetGroups,
  onSelectCondition,
  onNameChange,
  onFleetGroupChange,
  onUpdateParam,
  onToggleFromList,
  children,
})


{
  return (
    <>
      <section>

        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-fleet-text">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-fleet-blue text-xs text-white"> 1 </span>
          Select Condition
        </div>

        <div className="flex flex-col gap-2">
          {CONDITIONS.map((c) => {
            const active = conditionType === c.type;

            const Icon = c.icon;

            return (
              <button
                type="button"
                key={c.type}
                onClick={() => onSelectCondition(c.type)}
                className={
                  'flex items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors ' +
                  (active
                    ? 'border-fleet-blue bg-fleet-panel'
                    : 'border-fleet-border bg-fleet-surface hover:border-fleet-secondary')
                }
              >
                
                <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-fleet-blue" strokeWidth={1.6} />

                <span>

                  <span className="block text-sm font-semibold text-fleet-text">{c.title}</span>
                  <span className="mt-0.5 block text-xs text-fleet-secondary">{c.description}</span>

                </span>

              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}