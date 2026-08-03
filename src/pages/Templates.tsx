import { useEffect, useState, type FormEvent } from 'react';
import { subscribeTemplates, createTemplate, updateTemplate, deleteTemplate, type ReplyTemplate } from '../firebase/templates';

export function TemplatesPage() {
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<ReplyTemplate>>({});

  useEffect(() => subscribeTemplates(setTemplates), []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    await createTemplate({ title: title.trim(), body: body.trim() });
    setTitle('');
    setBody('');
  }

  function startEdit(t: ReplyTemplate) {
    setEditingId(t.id);
    setEditDraft({ title: t.title, body: t.body });
  }

  async function saveEdit(id: string) {
    await updateTemplate(id, { title: (editDraft.title ?? '').trim(), body: (editDraft.body ?? '').trim() });
    setEditingId(null);
  }

  async function handleDelete(t: ReplyTemplate) {
    if (!window.confirm(`Naozaj chcete zmazať šablónu "${t.title}"?`)) return;
    await deleteTemplate(t.id);
  }

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: 0.4 }}>NASTAVENIA</div>
      <h1 style={{ fontSize: 24, margin: '4px 0 4px' }}>Šablóny odpovedí</h1>
      <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
        Preddefinované texty, ktoré si agenti môžu rýchlo vložiť do odpovede na tickete.
      </p>

      <form
        onSubmit={handleAdd}
        style={{
          marginBottom: 20,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Názov šablóny" style={inputStyle} required />
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Text šablóny…"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', marginBottom: 10 }}
        />
        <button
          type="submit"
          style={{
            padding: '10px 18px',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
          }}
        >
          + Pridať šablónu
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {templates.length === 0 && (
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontSize: 13.5,
            }}
          >
            Zatiaľ žiadne šablóny.
          </div>
        )}
        {templates.map((t) => {
          const isEditing = editingId === t.id;
          return (
            <div
              key={t.id}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 16,
              }}
            >
              {isEditing ? (
                <>
                  <input
                    value={editDraft.title ?? ''}
                    onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                    style={{ ...inputStyle, marginBottom: 8, fontWeight: 700 }}
                  />
                  <textarea
                    value={editDraft.body ?? ''}
                    onChange={(e) => setEditDraft((d) => ({ ...d, body: e.target.value }))}
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', marginBottom: 10 }}
                  />
                  <button onClick={() => saveEdit(t.id)} style={saveBtnStyle}>
                    Uložiť
                  </button>
                  <button onClick={() => setEditingId(null)} style={actionBtnStyle}>
                    Zrušiť
                  </button>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{t.title}</div>
                    <div style={{ whiteSpace: 'nowrap' }}>
                      <button onClick={() => startEdit(t)} style={actionBtnStyle}>
                        Upraviť
                      </button>
                      <button onClick={() => handleDelete(t)} style={deleteBtnStyle}>
                        Zmazať
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6, whiteSpace: 'pre-wrap' }}>
                    {t.body}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
} as const;

const actionBtnStyle = {
  padding: '5px 10px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface)',
  fontSize: 12,
  fontWeight: 600,
  marginRight: 6,
  cursor: 'pointer',
} as const;

const saveBtnStyle = { ...actionBtnStyle, background: 'var(--color-primary)', color: '#fff', border: '1px solid var(--color-primary)' };
const deleteBtnStyle = { ...actionBtnStyle, color: 'var(--color-danger)', border: '1px solid var(--color-danger)' };
