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
      <section>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-fleet-text">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-fleet-blue text-xs text-white">1</span>
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

        <div className='mb-3 flex items-center gap-2 text-sm font-semibold text-fleet-text'>
          <span className='flex h-5 w-5 items-center justify-center rounded-full bg-fleet-blue text-xs text-white'>2</span>
          Configure Parameters
        </div>

        {error && (
          <div className='mb-4 rounded-md border border-fleet-alert/30 bg-fleet-alert/10 px-3 py-2 text-sm text-fleet-alert'>
            {error}
          </div>
        )}

        <div className='mb-4'>
          <label className={labelClasses} htmlFor="alert-name">Alert Name</label>
          <input
            id="alert-name"
            className={inputClasses}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder='High Speeding'
            required
          />
        </div>
        <div className='mb-4'>
          <label className={labelClasses} htmlFor='fleet-group'>Fleet Group</label>
          <select
            id='fleet-group'
            className={inputClasses}
            value={fleetGroupId}
            onChange={(e) => onFleetGroupChange(e.target.value)}
            required
          >
            <option value=''>Select a fleet group</option>
            {fleetGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        {conditionType === 'speed_threshold' && (
          <div className='mb-4'>
            <label className={labelClasses} htmlFor='max-speed'>Speed Limit (km/h)</label>
            <input
              id='max-speed'
              type='number'
              min='1'
              className={inputClasses}
              value={params.max_speed_kmh}
              onChange={(e) => onUpdateParam('max_speed_kmh', e.target.value)}
              required
            />
          </div>
        )}

        {conditionType === 'time_based_restriction' &&  (
          <>
            <div className='mb-4 grid grid-cols-2 gap-3'>
              <div>
                <label className={labelClasses} htmlFor="start-time">Start Time</label>
                 <input
                  id='start-time'
                  type='time'
                  className={inputClasses}
                  value={params.start_time}
                  onChange={(e) => onUpdateParam('start_time', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClasses} htmlFor="end-time">End Time</label>
                <input
                  id='end-time'
                  type='time'
                  className={inputClasses}
                  value={params.end_time}
                  onChange={(e) => onUpdateParam('end_time', e.target.value)}
                  required
                />
              </div>
            </div>
            <fieldset className="mb-4 border-0 p-0 m-0">
              <legend className={labelClasses}>Restricted Days</legend>
              <div className="flex flex-wrap gap-2">
                 {DAYS.map((d) => {
                  const active = params.restricted_days.includes(d);

                  return (
                    <button
                      type="button"
                      key={d}
                      onClick={() => onToggleFromList('restricted_days', d)}
                      className={
                        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors' +
                        (active
                          ? 'border-fleet-blue bg-fleet-blue text-white'
                          : 'border-fleet-border bg-fleet-surface text-fleet-text hover:border-fleet-secondary'
                        )
                      }
                    >
                      {d}
                    </button>
                  );
                 })} 
              </div>
            </fieldset>
          </>
        )}

        {conditionType === 'repeated_unsafe_events' && (
          <>

          <fieldset className="mb-4 border-0 p-0 m-0">
            <legend className={labelClasses}>Event Types</legend>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((ev) => {
                const active = params.event_types.includes(ev.value);
                return (
                  <button
                    type="button"
                    key={ev.value}
                    onClick={() => onToggleFromList('event_types', ev.value)}
                    className={
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors' +
                      (active
                        ? 'border-fleet-blue bg-fleet-blue text-white'
                        : 'border-fleet-border bg-fleet-surface text-fleet-text hover:border-fleet-secondary'
                      )
                    }
                  >
                    {ev.label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div className='mb-4 grid grid-cols-2 gap-3'>
            <div>
              <label className={labelClasses} htmlFor="count">Occurrences</label>
              <input
                id='count'
                type="number"
                min="1"
                className={inputClasses}
                value={params.count}
                onChange={(e) => onUpdateParam('count', e.target.value)}
                required 
              />
            </div>
            <div>
              <label className={labelClasses} htmlFor="window">Within (minutes)</label>
              <input
                id="window"
                type="number" 
                min="1"
                className={inputClasses}
                value={params.window_minutes}
                onChange={(e) => onUpdateParam('window_minutes', e.target.value)}
                required
              />
            </div>
          </div>
          </>
        )}

        {conditionType === 'safety_score_drop' && (
          <div className="mb-4">
            <label className={labelClasses} htmlFor="min-score">Minimum Safety Score</label>
            <input
              id='min-score'
              type="number"
              min="0"
              max="100"
              className={inputClasses}
              value={params.min_score}
              onChange={(e) => onUpdateParam('min_score', e.target.value)}
              required 
            />
          </div>
        )}

        {conditionType === 'trip_duration_exceeded' && (
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className={labelClasses} htmlFor="max-trip">Max Trip Duration (min)</label>
              <input
                id="max-trip"
                type="number"
                min="1"
                className={inputClasses}
                value={params.max_trip_minutes}
                onChange={(e) => onUpdateParam('max_trip_minutes', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClasses} htmlFor="max-daily">Max Daily Duration (min)</label>
              <input
                id="max-daily"
                type="number"
                min="1"
                className={inputClasses}
                value={params.max_daily_minutes}
                onChange={(e) => onUpdateParam('max_daily_minutes', e.target.value)}
              />
            </div>
          </div>
        )}
        {children}
      </section>
  );
}