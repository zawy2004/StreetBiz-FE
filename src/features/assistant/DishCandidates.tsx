import { useId, useState } from 'react';
import { PiForkKnife, PiMagnifyingGlass, PiPencilSimple } from 'react-icons/pi';
import type { AssistantCard } from './types';

const CUES = 'Dấu hiệu nhận thấy';

/** [AI] candidates from a food photo. Picking one only asks a new question; nothing is confirmed. */
export function DishCandidates({
  card,
  disabled,
  onAsk,
}: {
  card: AssistantCard;
  disabled: boolean;
  onAsk: (question: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const inputId = useId();
  const candidates = card.fields.filter((f) => f.label !== CUES);
  const cues = card.fields.find((f) => f.label === CUES)?.value;
  if (!candidates.length) return null;
  const [main, ...others] = candidates;
  const tone = (value: string) => (value === 'Khá chắc' ? 'is-high' : value === 'Chưa chắc' ? 'is-low' : '');
  return (
    <section className="sb-dish" aria-label="Nhận định món từ ảnh">
      <header className="sb-dish-head">
        <span className="sb-dish-icon" aria-hidden="true">
          <PiForkKnife />
        </span>
        <div>
          <p className="sb-eyebrow">[AI] Nhận định từ ảnh · chưa xác minh</p>
          <h4>
            {main!.label} <span className={`sb-confidence ${tone(main!.value)}`}>{main!.value}</span>
          </h4>
        </div>
      </header>
      {cues && <p className="sb-dish-cues">{cues}</p>}
      {others.length > 0 && (
        <div className="sb-dish-alts">
          <span>Cũng có thể là</span>
          {others.map((o) => (
            <button
              key={o.label}
              type="button"
              className="sb-chip"
              disabled={disabled}
              onClick={() => onAsk(`Tìm quán bán ${o.label}`)}
            >
              {o.label} <small>{o.value}</small>
            </button>
          ))}
        </div>
      )}
      {editing ? (
        <form
          className="sb-dish-fix"
          onSubmit={(e) => {
            e.preventDefault();
            const value = name.trim();
            if (value.length >= 2) {
              onAsk(`Tìm quán bán ${value}`);
              setEditing(false);
              setName('');
            }
          }}
        >
          <label htmlFor={inputId} className="sr-only">
            Tên món đúng
          </label>
          <input
            id={inputId}
            autoFocus
            value={name}
            maxLength={60}
            placeholder="Tên món đúng là…"
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="sb-chip is-solid" disabled={disabled || name.trim().length < 2}>
            <PiMagnifyingGlass aria-hidden="true" /> Tìm quán
          </button>
        </form>
      ) : (
        <button type="button" className="sb-link" disabled={disabled} onClick={() => setEditing(true)}>
          <PiPencilSimple aria-hidden="true" /> Không phải món này?
        </button>
      )}
    </section>
  );
}
