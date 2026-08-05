import { useEffect, useState, type FormEvent } from 'react';
import {
  subscribeKbArticles,
  createKbArticle,
  updateKbArticle,
  deleteKbArticle,
  type KbArticle,
} from '../firebase/kbArticles';

function emptyForm() {
  return { title: '', category: '', url: '', body: '' };
}

export function KbArticlesSettingsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<KbArticle>>({});

  useEffect(() => subscribeKbArticles(setArticles), []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const order = articles.length > 0 ? Math.max(...articles.map((a) => a.order)) + 1 : 0;
    await createKbArticle({
      title: form.title.trim(),
      category: form.category.trim(),
      url: form.url.trim(),
      body: form.body.trim(),
      order,
    });
    setForm(emptyForm());
  }

  function startEdit(a: KbArticle) {
    setEditingId(a.id);
    setEditDraft({ title: a.title, category: a.category, url: a.url, body: a.body });
  }

  async function saveEdit(id: string) {
    await updateKbArticle(id, {
      title: (editDraft.title ?? '').trim(),
      category: (editDraft.category ?? '').trim(),
      url: (editDraft.url ?? '').trim(),
      body: (editDraft.body ?? '').trim(),
    });
    setEditingId(null);
  }

  async function handleDelete(a: KbArticle) {
    if (!window.confirm(`Naozaj chcete zmazať článok "${a.title}"?`)) return;
    await deleteKbArticle(a.id);
  }

  async function move(a: KbArticle, direction: -1 | 1) {
    const sorted = [...articles].sort((x, y) => x.order - y.order);
    const idx = sorted.findIndex((x) => x.id === a.id);
    const swapWith = sorted[idx + direction];
    if (!swapWith) return;
    await Promise.all([
      updateKbArticle(a.id, { order: swapWith.order }),
      updateKbArticle(swapWith.id, { order: a.order }),
    ]);
  }

  return (
    <div>
      {!embedded && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: 0.4 }}>NASTAVENIA</div>
          <h1 style={{ fontSize: 24, margin: '4px 0 4px' }}>Znalostná báza</h1>
          <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
            Články zobrazené v sekcii "Najčastejšie riešené témy" na verejnej podpornej stránke /support. Prvé 3 sa
            zobrazujú priamo na úvode, celý zoznam po kliknutí na "Znalostná báza".
          </p>
        </>
      )}

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
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.4fr auto', gap: 10, alignItems: 'end', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 6 }}>Názov *</div>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ako resetovať heslo…" style={inputStyle} required />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 6 }}>Kategória</div>
            <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Prístup / heslo" style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 6 }}>Odkaz (nepovinné)</div>
            <input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://… (ak je vyplnené, prepíše sa obsah nižšie)" style={inputStyle} />
          </div>
          <button
            type="submit"
            style={{
              padding: '10px 18px',
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            + Pridať
          </button>
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 6 }}>Obsah článku (zobrazí sa priamo na /support, ak nie je vyplnený odkaz)</div>
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder="Text návodu…"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {articles.length === 0 && (
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
            Zatiaľ žiadne články.
          </div>
        )}
        {articles.map((a, i) => {
          const isEditing = editingId === a.id;
          return (
            <div
              key={a.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 14,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 2 }}>
                <button onClick={() => move(a, -1)} disabled={i === 0} style={moveBtnStyle}>
                  ▲
                </button>
                <button onClick={() => move(a, 1)} disabled={i === articles.length - 1} style={moveBtnStyle}>
                  ▼
                </button>
              </div>

              <div style={{ flex: 1 }}>
                {isEditing ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.4fr', gap: 8, marginBottom: 8 }}>
                      <input value={editDraft.title ?? ''} onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))} style={inputStyle} />
                      <input value={editDraft.category ?? ''} onChange={(e) => setEditDraft((d) => ({ ...d, category: e.target.value }))} style={inputStyle} />
                      <input value={editDraft.url ?? ''} onChange={(e) => setEditDraft((d) => ({ ...d, url: e.target.value }))} style={inputStyle} />
                    </div>
                    <textarea
                      value={editDraft.body ?? ''}
                      onChange={(e) => setEditDraft((d) => ({ ...d, body: e.target.value }))}
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {a.category || '—'} {a.url && <span style={{ marginLeft: 8 }}>{a.url}</span>}
                    </div>
                    {a.body && (
                      <div style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: 6, whiteSpace: 'pre-wrap' }}>{a.body}</div>
                    )}
                  </>
                )}
              </div>

              <div style={{ whiteSpace: 'nowrap' }}>
                {isEditing ? (
                  <>
                    <button onClick={() => saveEdit(a.id)} style={saveBtnStyle}>
                      Uložiť
                    </button>
                    <button onClick={() => setEditingId(null)} style={actionBtnStyle}>
                      Zrušiť
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(a)} style={actionBtnStyle}>
                      Upraviť
                    </button>
                    <button onClick={() => handleDelete(a)} style={deleteBtnStyle}>
                      Zmazať
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '9px 11px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  fontSize: 13,
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

const moveBtnStyle = {
  width: 20,
  height: 18,
  padding: 0,
  border: '1px solid var(--color-border)',
  borderRadius: 4,
  background: 'var(--color-surface)',
  fontSize: 9,
  cursor: 'pointer',
  lineHeight: 1,
} as const;
