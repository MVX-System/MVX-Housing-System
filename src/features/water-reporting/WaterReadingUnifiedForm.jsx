import React, { useMemo, useRef, useState } from 'react';
import {
  buildSubmission,
  calculateFormState,
  formatCubicMetres,
  groupMetersByLocation,
} from './waterReadingLogic.js';
import './waterReadingUnified.css';

const I18N = {
  ru: {
    title: 'Показания воды', completed: 'Готово', cold: 'Холодная вода', hot: 'Горячая вода',
    meter: 'Счётчик', riser: 'Стояк', was: 'Было, м³', now: 'Сейчас, м³', usage: 'Расход, м³',
    leave: 'Оставить без изменений', total: 'Суммарный расход', calculated: 'Рассчитано по',
    from: 'из', meterCount: 'счётчиков', submit: 'Передать все показания', sending: 'Передача…',
    fill: 'Заполните все счётчики или отметьте «Оставить без изменений».',
    ready: 'Все показания готовы к отправке.', accepted: 'Все показания приняты.',
    invalid: 'Введите число (не более 3 знаков после запятой).',
    below_previous: 'Показание ниже предыдущего.',
    no_previous: 'Нет предыдущего показания — нельзя оставить без изменений.',
    high: 'Проверьте необычно большой расход.', unknown: '—',
    noBaseline: 'Предыдущего показания нет: расход не рассчитывается.',
    failed: 'Не удалось передать показания. Изменения не подтверждены. Повторите попытку.',
    conflict: 'Данные изменились, период закрыт или показания уже переданы. Обновите страницу и проверьте историю.',
    writeFailed: 'Сервер не смог сохранить показания. Проверьте историю перед повторной отправкой.',
    unavailable: 'Отправка пока не подключена.', history: 'История', closed: 'Приём показаний закрыт.',
  },
  lv: {
    title: 'Ūdens skaitītāju rādījumi', completed: 'Gatavs', cold: 'Aukstais ūdens', hot: 'Karstais ūdens',
    meter: 'Skaitītājs', riser: 'Stāvvads', was: 'Iepriekš, m³', now: 'Tagad, m³', usage: 'Patēriņš, m³',
    leave: 'Atstāt bez izmaiņām', total: 'Kopējais patēriņš', calculated: 'Aprēķināts',
    from: 'no', meterCount: 'skaitītājiem', submit: 'Iesniegt visus rādījumus', sending: 'Iesniegšana…',
    fill: 'Ievadiet visus rādījumus vai atzīmējiet “Atstāt bez izmaiņām”.',
    ready: 'Visi rādījumi ir gatavi iesniegšanai.', accepted: 'Visi rādījumi ir pieņemti.',
    invalid: 'Ievadiet skaitli (līdz 3 zīmēm aiz komata).',
    below_previous: 'Rādījums ir mazāks par iepriekšējo.',
    no_previous: 'Nav iepriekšējā rādījuma — nevar atstāt bez izmaiņām.',
    high: 'Pārbaudiet neparasti lielu patēriņu.', unknown: '—',
    noBaseline: 'Nav iepriekšējā rādījuma: patēriņš nav aprēķināms.',
    failed: 'Rādījumus neizdevās iesniegt. Saglabāšana nav apstiprināta. Mēģiniet vēlreiz.',
    conflict: 'Dati ir mainījušies, periods ir slēgts vai rādījumi jau iesniegti. Pārlādējiet lapu un pārbaudiet vēsturi.',
    writeFailed: 'Serverim neizdevās saglabāt rādījumus. Pirms atkārtotas iesniegšanas pārbaudiet vēsturi.',
    unavailable: 'Iesniegšana vēl nav pieslēgta.', history: 'Vēsture', closed: 'Rādījumu iesniegšana ir slēgta.',
  },
  en: {
    title: 'Water meter readings', completed: 'Completed', cold: 'Cold water', hot: 'Hot water',
    meter: 'Meter', riser: 'Riser', was: 'Previous, m³', now: 'Current, m³', usage: 'Usage, m³',
    leave: 'Leave unchanged', total: 'Total consumption', calculated: 'Calculated for',
    from: 'of', meterCount: 'meters', submit: 'Submit all readings', sending: 'Submitting…',
    fill: 'Enter all readings or select “Leave unchanged”.',
    ready: 'All readings are ready to submit.', accepted: 'All readings have been accepted.',
    invalid: 'Enter a number (up to 3 decimal places).',
    below_previous: 'Reading is lower than the previous value.',
    no_previous: 'No previous reading: cannot leave unchanged.',
    high: 'Please verify unusually high consumption.', unknown: '—',
    noBaseline: 'No previous reading: consumption cannot be calculated.',
    failed: 'Submission failed. Changes have not been confirmed. Please try again.',
    conflict: 'Readings have changed, the period is closed, or readings were already submitted. Refresh and check history.',
    writeFailed: 'The server could not confirm the save. Check history before retrying.',
    unavailable: 'Submission is not connected yet.', history: 'History', closed: 'Reading collection is closed.',
  },
};

function MeterPanel({ meter, status, draft, isUnchanged, submissionLocked, onDraftChange, onUnchangedChange, onHistory, locale, t }) {
  const key = String(meter.id);
  const errorId = `mvx-water-error-${key.replace(/[^\w-]/g, '-')}`;
  const type = String(meter.kind || meter.type || '').toLowerCase();
  const cold = ['cold', 'cw', 'хв', 'aukstais', 'холодная'].includes(type);
  const hot = ['hot', 'hw', 'гв', 'karstais', 'горячая'].includes(type);
  const colorClass = cold ? 'cold' : hot ? 'hot' : '';
  const abnormal = !isUnchanged && status.ready && status.consumption !== null &&
    Number.isFinite(meter.highConsumptionThreshold) &&
    status.consumption > meter.highConsumptionThreshold * 1000;
  const error = status.error && status.error !== 'missing' ? t[status.error] : null;

  return (
    <div className={`mvx-water-meter ${isUnchanged ? 'mvx-water-meter--unchanged' : ''}`}>
      <div className="mvx-water-meter__content" aria-disabled={isUnchanged}>
        <div className="mvx-water-meter__heading">
          <strong className="mvx-water-meter__name">
            <span aria-hidden="true" className={`mvx-water-drop ${colorClass}`}>●</span>
            {meter.label || (cold ? t.cold : hot ? t.hot : String(meter.kind || meter.type || t.meter))}
          </strong>
          {status.ready && !isUnchanged && <span aria-label="Valid" className="mvx-water-meter__check">✓</span>}
          {isUnchanged && <span aria-hidden="true" className="mvx-water-meter__locked">🔒</span>}
        </div>
        <div className="mvx-water-meter__meta">
          {t.meter}: {meter.serial || '—'}{meter.riser ? ` · ${t.riser}: ${meter.riser}` : ''}
        </div>
        <div className="mvx-water-meter__values">
          <div className="mvx-water-field">
            <span className="mvx-water-field__label">{t.was}</span>
            <div className="mvx-water-value" aria-label={`${t.was} ${formatCubicMetres(status.previous, locale)}`}>
              {formatCubicMetres(status.previous, locale)}
            </div>
          </div>
          <label className="mvx-water-field">
            <span className="mvx-water-field__label">{t.now}</span>
            <input
              type="text" inputMode="decimal" autoComplete="off" spellCheck={false}
              className="mvx-water-input" placeholder="0,000"
              value={isUnchanged ? '' : draft}
              disabled={isUnchanged || submissionLocked}
              onChange={event => onDraftChange(key, event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
            />
          </label>
          <div className="mvx-water-field">
            <span className="mvx-water-field__label">{t.usage}</span>
            <div className="mvx-water-value mvx-water-value--consumption" aria-live="polite">
              {status.consumption === null ? '—' : `${status.consumption > 0 ? '+' : ''}${formatCubicMetres(status.consumption, locale)}`}
            </div>
          </div>
        </div>
        {!isUnchanged && error && <div id={errorId} className="mvx-water-error" role="alert">{error}</div>}
        {!isUnchanged && abnormal && <div className="mvx-water-warning" role="status">{t.high}</div>}
        {!isUnchanged && status.ready && status.previous === null &&
          <div className="mvx-water-info">{t.noBaseline}</div>}
      </div>
      <div className="mvx-water-meter__actions">
      <label className="mvx-water-unchanged">
        <input type="checkbox" checked={isUnchanged} disabled={submissionLocked} onChange={event => onUnchangedChange(key, event.target.checked)} />
        <span>{t.leave}</span>
      </label>
      <button type="button" className="mvx-water-history" onClick={() => onHistory?.(meter.id)}>{t.history}</button>
      </div>
    </div>
  );
}

/**
 * PR-10K.1 unified resident form.
 *
 * Props:
 *  meters: [{id,kind,location,serial,riser,previous,highConsumptionThreshold?}]
 *  reportingPeriodId: ID resolved from the ACTIVE reporting period in the app
 *  periodLabel: e.g. "окт. 2026" (use existing project period label helper)
 *  apartmentLabel: apartment number/label for display
 *  locale: 'ru' | 'lv' | 'en'
 *  onSubmit: async (batch) => ({ ok: true, receipt?: ... })
 *
 * IMPORTANT: parent should key component by apartmentId + reportingPeriodId,
 * so drafts reset when switching apartment/period, not on background refetches.
 */
export default function WaterReadingUnifiedForm({
  meters = [], reportingPeriodId, periodLabel, apartmentLabel,
  locale = 'ru', onSubmit, onSuccess, onHistory, submissionDisabled = false,
}) {
  const language = Object.prototype.hasOwnProperty.call(I18N, locale) ? locale : 'ru';
  const t = I18N[language];
  const [drafts, setDrafts] = useState({});
  const [unchanged, setUnchanged] = useState({});
  const [phase, setPhase] = useState('idle');
  const [submitError, setSubmitError] = useState('');
  const inFlight = useRef(false);
  const groups = useMemo(() => groupMetersByLocation(meters, language), [meters, language]);
  const form = calculateFormState(meters, drafts, unchanged);
  const isSubmitting = phase === 'submitting';
  const isAccepted = phase === 'accepted';
  const enabled = form.canSubmit && !isSubmitting && !isAccepted && !submissionDisabled && typeof onSubmit === 'function';

  const editDraft = (key, raw) => {
    setDrafts(prev => ({ ...prev, [key]: raw }));
    setSubmitError('');
  };
  const changeUnchanged = (key, checked) => {
    setUnchanged(prev => ({ ...prev, [key]: checked }));
    setSubmitError('');
  };

  const submit = async event => {
    event.preventDefault();
    if (!enabled || inFlight.current) return;
    inFlight.current = true;
    let batch;
    try {
      batch = buildSubmission({ meters, drafts, unchanged, reportingPeriodId });
    } catch (e) {
      setSubmitError(e.message);
      inFlight.current = false;
      return;
    }
    setPhase('submitting');
    setSubmitError('');
    try {
      // Only a server-confirmed, successful atomic operation counts as accepted.
      const result = await onSubmit(batch);
      if (!result || result.ok !== true) throw new Error(t.failed);
      setPhase('accepted');
      // Refresh failure must not turn a committed submission into a false failure.
      if (onSuccess) {
        try { await onSuccess(result); } catch { /* commit remains successful */ }
      }
    } catch (error) {
      setSubmitError(error?.message === 'water_batch_conflict_or_period_closed' ? t.conflict :
        error?.message === 'water_batch_write_failed' ? t.writeFailed : t.failed);
      setPhase('idle');
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <form className="mvx-water-form" onSubmit={submit} noValidate>
      <header className="mvx-water-form__header">
        <div>
          <h2>{t.title}</h2>
          <p>{[apartmentLabel, periodLabel].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="mvx-water-form__progress-label">
          <small>{t.completed}</small>
          <strong>{form.completed} / {form.total}</strong>
        </div>
      </header>
      <div className="mvx-water-form__progress" aria-label={`${t.completed}: ${form.completed} / ${form.total}`}>
        {meters.map((m) => <span key={String(m.id)} className={form.states[String(m.id)]?.ready ? 'is-complete' : ''} />)}
      </div>

      {groups.map(group => (
        <section className="mvx-water-section" key={group.name} aria-label={group.name}>
          <h3 className="mvx-water-section__heading">{group.name}</h3>
          {group.meters.map(meter => (
            <MeterPanel
              key={String(meter.id)} meter={meter} locale={language} t={t}
              status={form.states[String(meter.id)]}
              draft={drafts[String(meter.id)] || ''}
              isUnchanged={unchanged[String(meter.id)] === true}
              submissionLocked={submissionDisabled || isSubmitting || isAccepted}
              onHistory={onHistory}
              onDraftChange={editDraft}
              onUnchangedChange={changeUnchanged}
            />
          ))}
        </section>
      ))}
      <section className="mvx-water-summary" aria-label={t.total}>
        <div className="mvx-water-summary__title">{t.total}</div>
        <div className="mvx-water-summary__value" aria-live="polite">{formatCubicMetres(form.totalConsumption, language)} м³</div>
        <div className="mvx-water-summary__subtitle">{t.calculated} {form.calculated} {t.from} {form.total} {t.meterCount}</div>
      </section>
      <button className="mvx-water-submit" type="submit" disabled={!enabled}>
        {isSubmitting ? t.sending : t.submit}
      </button>
      {isAccepted ? <div role="status" className="mvx-water-success">{t.accepted}</div> :
        submitError ? <div role="alert" className="mvx-water-error">{submitError}</div> :
        <p className="mvx-water-form__hint">{submissionDisabled ? t.closed : !onSubmit ? t.unavailable : form.canSubmit ? t.ready : t.fill}</p>}
    </form>
  );
}
