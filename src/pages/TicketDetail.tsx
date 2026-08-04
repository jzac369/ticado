import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addTicketMessage,
  archiveTicket,
  subscribeActivity,
  subscribeMessages,
  subscribeTicket,
  unarchiveTicket,
  updateTicketAssignment,
  updateTicketPriority,
  updateTicketStatus,
  updateTicketTags,
} from '../firebase/tickets';
import type { ActivityEntry, Attachment, Ticket, TicketMessage, TicketPriority, TicketStatus } from '../types';
import { STATUS_LABELS, PRIORITY_LABELS, CHANNEL_LABELS } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { PriorityBadge, StatusBadge, statusColors, priorityColors } from '../components/Badges';
import { subscribeAgents, type Agent } from '../firebase/agents';
import { uploadAttachments } from '../firebase/attachments';
import { subscribeTemplates, type ReplyTemplate } from '../firebase/templates';
import { TicketTimeline } from '../components/TicketTimeline';
import { Icon } from '../components/Icon';

function fmt(ts: TicketMessage['createdAt']) {
  if (!ts) return '';
  return ts.toDate().toLocaleString('sk-SK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentList({ attachments }: { attachments?: Attachment[] }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
      {attachments.map((a, i) =>
        a.contentType.startsWith('image/') ? (
          <a key={i} href={a.url} target="_blank" rel="noreferrer">
            <img
              src={a.url}
              alt={a.name}
              style={{ maxWidth: 160, maxHeight: 120, borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
            />
          </a>
        ) : (
          <a
            key={i}
            href={a.url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              padding: '6px 10px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text)',
            }}
          >
            <Icon name="paperclip" size={12} /> {a.name} <span style={{ color: 'var(--color-text-faint)' }}>({formatSize(a.size)})</span>
          </a>
        ),
      )}
    </div>
  );
}

export function TicketDetailPage() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const isClient = profile?.role === 'klient';
  const [ticket, setTicket] = useState<Ticket | null | undefined>(undefined);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [attachError, setAttachError] = useState<string | null>(null);

  useEffect(() => {
    if (isClient) return;
    return subscribeAgents(setAgents);
  }, [isClient]);
  useEffect(() => {
    if (isClient) return;
    return subscribeTemplates(setTemplates);
  }, [isClient]);

  useEffect(() => {
    if (!id) return;
    const u1 = subscribeTicket(id, setTicket);
    const u2 = subscribeMessages(id, setMessages);
    const u3 = subscribeActivity(id, setActivity);
    return () => {
      u1();
      u2();
      u3();
    };
  }, [id]);

  if (ticket === undefined) {
    return <div>Načítavam ticket…</div>;
  }
  if (ticket === null || !id) {
    return <div>Ticket nebol nájdený. <Link to="/tickets">Späť na tickety</Link></div>;
  }
  if (isClient && profile?.role === 'klient' && ticket.customerId !== profile.customerId) {
    return (
      <div>
        Nemáte prístup k tomuto tiketu. <Link to="/">Späť na moje tickety</Link>
      </div>
    );
  }

  const actorName = user?.email ?? 'Agent';
  const visibleMessages = isClient ? messages.filter((m) => !m.isPrivate) : messages;

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if ((!reply.trim() && pendingFiles.length === 0) || !id) return;
    setSending(true);
    setAttachError(null);
    try {
      const attachments = pendingFiles.length > 0 ? await uploadAttachments(id, pendingFiles) : undefined;
      await addTicketMessage(id, {
        authorName: actorName,
        body: reply.trim(),
        isPrivate,
        attachments,
      });
      setReply('');
      setIsPrivate(false);
      setPendingFiles([]);
    } catch (err) {
      setAttachError(err instanceof Error ? err.message : 'Nepodarilo sa nahrať prílohu.');
    } finally {
      setSending(false);
    }
  }

  function addFiles(files: FileList | File[]) {
    setPendingFiles((prev) => [...prev, ...Array.from(files)]);
  }

  function removeFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData.items);
    const imageFiles = items
      .filter((item) => item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null);
    if (imageFiles.length > 0) {
      addFiles(imageFiles);
    }
  }

  async function handleStatusChange(status: TicketStatus) {
    if (!id) return;
    await updateTicketStatus(id, status, actorName);
  }

  async function handleAssign(value: string) {
    if (!id) return;
    await updateTicketAssignment(id, value || null, actorName);
  }

  async function handlePriorityChange(value: TicketPriority) {
    if (!id) return;
    await updateTicketPriority(id, value, actorName);
  }

  async function handleArchiveToggle() {
    if (!id) return;
    if (ticket?.archived) {
      await unarchiveTicket(id, actorName);
    } else {
      await archiveTicket(id, actorName);
    }
  }

  const currentTags = ticket.tags ?? [];

  async function handleAddTag(e: FormEvent) {
    e.preventDefault();
    const tag = tagInput.trim();
    if (!tag || !id) return;
    if (!currentTags.includes(tag)) {
      await updateTicketTags(id, [...currentTags, tag]);
    }
    setTagInput('');
  }

  async function removeTag(tag: string) {
    if (!id) return;
    await updateTicketTags(id, currentTags.filter((t) => t !== tag));
  }

  const closed = ticket.status === 'uzavrety';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12.5, marginBottom: 4 }}>
            <Link to="/tickets" style={{ color: 'var(--color-text-muted)' }}>
              Tickety
            </Link>{' '}
            / <span style={{ fontWeight: 700 }}>{ticket.code}</span>
          </div>
          <h1 style={{ fontSize: 22, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            {ticket.subject}
            {ticket.archived && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--color-text-faint)',
                  background: 'var(--color-surface-2)',
                  borderRadius: 999,
                  padding: '2px 9px',
                }}
              >
                <Icon name="archive" size={11} /> Archivovaný
              </span>
            )}
          </h1>
          <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>
            Ticket / {ticket.code} · Vytvorený {fmt(ticket.createdAt)} · {ticket.customerName}
            {ticket.department && ` - ${ticket.department}`} · {CHANNEL_LABELS[ticket.channel]}
          </div>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {!isClient && (
            <button onClick={handleArchiveToggle} style={outlineBtnStyle}>
              <Icon name={ticket.archived ? 'download' : 'archive'} size={14} />
              {ticket.archived ? 'Obnoviť z archívu' : 'Archivovať'}
            </button>
          )}
          <button onClick={() => window.print()} style={outlineBtnStyle}>
            <Icon name="printer" size={14} />
            Tlačiť / PDF
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 0,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 16,
          overflow: 'hidden',
        }}
      >
        <QuickStat label="Stav">
          <StatusBadge status={ticket.status} />
        </QuickStat>
        <QuickStat label="Priorita">
          <PriorityBadge priority={ticket.priority} />
        </QuickStat>
        <QuickStat label="Kanál" last>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{CHANNEL_LABELS[ticket.channel]}</span>
        </QuickStat>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 20,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icon name="message" size={15} style={{ color: 'var(--color-primary)' }} />
            Komunikácia
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--color-text-faint)', marginBottom: 16 }}>
            {visibleMessages.length} správ a poznámok v tickete
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visibleMessages.map((m) => (
              <div
                key={m.id}
                style={{
                  borderLeft: `3px solid ${m.isPrivate ? 'var(--color-warning)' : 'var(--color-info)'}`,
                  background: 'var(--color-surface-2)',
                  borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                  padding: 14,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: 'var(--color-primary)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {m.authorName.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{m.authorName}</div>
                      {m.isPrivate && (
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: 'var(--color-warning)',
                            background: 'var(--color-warning-bg)',
                            borderRadius: 4,
                            padding: '1px 6px',
                          }}
                        >
                          PRIVÁTNA POZNÁMKA
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>{fmt(m.createdAt)}</div>
                </div>
                <div style={{ fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{m.body}</div>
                <AttachmentList attachments={m.attachments} />
              </div>
            ))}
            {visibleMessages.length === 0 && (
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Zatiaľ žiadna komunikácia.</div>
            )}
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 20,
          }}
          className="no-print"
        >
          <div style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icon name="edit" size={15} style={{ color: 'var(--color-primary)' }} />
            Odpovedať
          </div>
          {!closed ? (
            <form onSubmit={handleReply}>
              {!isClient && templates.length > 0 && (
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <button
                    type="button"
                    onClick={() => setTemplateMenuOpen((v) => !v)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-surface-2)',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Icon name="list" size={13} /> Šablóny odpovedí ▾
                  </button>
                  {templateMenuOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '110%',
                        left: 0,
                        zIndex: 15,
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-md)',
                        minWidth: 260,
                        maxHeight: 240,
                        overflowY: 'auto',
                      }}
                    >
                      {templates.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setReply((r) => (r ? `${r}\n${t.body}` : t.body));
                            setTemplateMenuOpen(false);
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            padding: '9px 12px',
                            border: 'none',
                            borderBottom: '1px solid var(--color-border)',
                            background: 'none',
                            fontSize: 12.5,
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontWeight: 700 }}>{t.title}</div>
                          <div style={{ color: 'var(--color-text-faint)', fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.body}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onPaste={handlePaste}
                placeholder="Napíšte odpoveď klientovi alebo internú poznámku…"
                rows={4}
                style={{
                  width: '100%',
                  padding: 12,
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  resize: 'vertical',
                }}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
                }}
                style={{
                  marginTop: 10,
                  padding: 14,
                  border: `1.5px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  background: dragOver ? 'var(--color-primary-bg)' : 'var(--color-surface-2)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                  Potiahnite súbory sem alebo vložte screenshot (Ctrl+V)
                </div>
                <label
                  style={{
                    display: 'inline-block',
                    padding: '6px 14px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Vybrať súbory
                  <input
                    type="file"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) addFiles(e.target.files);
                      e.target.value = '';
                    }}
                    style={{ display: 'none' }}
                  />
                </label>

                {pendingFiles.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, justifyContent: 'center' }}>
                    {pendingFiles.map((f, i) => (
                      <span
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          padding: '4px 8px',
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <Icon name="paperclip" size={12} /> {f.name}
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          style={{ border: 'none', background: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontWeight: 700 }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {attachError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 10,
                    padding: '8px 12px',
                    background: 'var(--color-danger-bg)',
                    border: '1px solid var(--color-danger)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-danger)',
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  <Icon name="alertTriangle" size={14} /> {attachError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                {!isClient ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
                    Privátna poznámka (nevidí klient)
                  </label>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  disabled={sending || (!reply.trim() && pendingFiles.length === 0)}
                  style={{
                    padding: '9px 18px',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 700,
                    opacity: sending || (!reply.trim() && pendingFiles.length === 0) ? 0.6 : 1,
                  }}
                >
                  {sending ? 'Odosielam…' : 'Odoslať'}
                </button>
              </div>
            </form>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                marginTop: 20,
                padding: 12,
                textAlign: 'center',
                color: 'var(--color-text-faint)',
                fontSize: 13,
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <Icon name="lock" size={14} /> Tento ticket je uzavretý.
            </div>
          )}
        </div>

        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel
            title={
              <>
                <Icon name="info" size={15} style={{ color: 'var(--color-primary)' }} /> Detaily ticketu
              </>
            }
          >
            <DetailRow icon={<Icon name="check" size={14} />} label="Stav ticketu" first>
              {isClient ? (
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{STATUS_LABELS[ticket.status]}</span>
              ) : (
                <select
                  value={ticket.status}
                  onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                  className="no-print"
                  style={inlineSelectStyle}
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option
                      key={k}
                      value={k}
                      style={{ color: statusColors[k as TicketStatus].fg, backgroundColor: statusColors[k as TicketStatus].bg }}
                    >
                      {v}
                    </option>
                  ))}
                </select>
              )}
            </DetailRow>
            <DetailRow icon={<Icon name="flag" size={14} />} label="Priorita">
              {isClient ? (
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{PRIORITY_LABELS[ticket.priority]}</span>
              ) : (
                <select
                  value={ticket.priority}
                  onChange={(e) => handlePriorityChange(e.target.value as TicketPriority)}
                  className="no-print"
                  style={inlineSelectStyle}
                >
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <option
                      key={k}
                      value={k}
                      style={{ color: priorityColors[k as TicketPriority].fg, backgroundColor: priorityColors[k as TicketPriority].bg }}
                    >
                      {v}
                    </option>
                  ))}
                </select>
              )}
            </DetailRow>
            <DetailRow icon={<Icon name="globe" size={14} />} label="Kanál">
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>{CHANNEL_LABELS[ticket.channel]}</span>
            </DetailRow>
            <DetailRow icon={<Icon name="calendar" size={14} />} label="Vytvorený">
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>{fmt(ticket.createdAt)}</span>
            </DetailRow>
            {!isClient && (
              <DetailRow icon={<Icon name="user" size={14} />} label="Priradenie">
                <select
                  value={ticket.assignedTo ?? ''}
                  onChange={(e) => handleAssign(e.target.value)}
                  className="no-print"
                  style={inlineSelectStyle}
                >
                  <option value="">— Bez priradenia —</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </DetailRow>
            )}
            <DetailRow icon={<Icon name="users" size={14} />} label="Žiadateľ" align="start">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    flexShrink: 0,
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  {ticket.requesterName.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{ticket.requesterName}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>
                    {ticket.customerName}
                    {ticket.department && <> · {ticket.department}</>}
                  </div>
                  {ticket.requesterEmail && (
                    <div style={{ fontSize: 10.5, color: 'var(--color-text-faint)' }}>{ticket.requesterEmail}</div>
                  )}
                </div>
              </div>
            </DetailRow>
            {!isClient && (
              <DetailRow icon={<Icon name="tag" size={14} />} label="Štítky" align="start">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  {(ticket.tags?.length ?? 0) > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
                      {(ticket.tags ?? []).map((tag) => (
                        <span
                          key={tag}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 999,
                            background: 'var(--color-primary-bg)',
                            color: 'var(--color-primary)',
                          }}
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            style={{ border: 'none', background: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 700, padding: 0 }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <form onSubmit={handleAddTag} className="no-print" style={{ display: 'flex', gap: 6 }}>
                    <input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Nový štítok…"
                      style={{ ...selectStyle, width: 140 }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: '0 12px',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-surface-2)',
                        fontWeight: 700,
                      }}
                    >
                      +
                    </button>
                  </form>
                </div>
              </DetailRow>
            )}
          </Panel>

          <Panel
            title={
              <>
                <Icon name="clock" size={15} style={{ color: 'var(--color-primary)' }} /> História zmien
              </>
            }
          >
            <TicketTimeline entries={activity.slice(0, 12)} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 13.5, marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function QuickStat({ label, children, last = false }: { label: string; children: ReactNode; last?: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        padding: '12px 18px',
        borderRight: last ? 'none' : '1px solid var(--color-border)',
      }}
    >
      <div style={{ fontSize: 10.5, color: 'var(--color-text-faint)', fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
  align = 'center',
  first = false,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  align?: 'center' | 'start';
  first?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: align === 'start' ? 'flex-start' : 'center',
        gap: 12,
        padding: '10px 0',
        borderTop: first ? 'none' : '1px solid var(--color-border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--color-text-muted)', flexShrink: 0 }}>
        {icon}
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

const selectStyle: CSSProperties = {
  width: '100%',
  padding: '9px 10px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
};

const inlineSelectStyle: CSSProperties = {
  border: 'none',
  background: 'none',
  fontWeight: 600,
  fontSize: 13.5,
  textAlign: 'center',
  textAlignLast: 'center',
  cursor: 'pointer',
  color: 'var(--color-text)',
};

const outlineBtnStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  padding: '7px 14px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  fontSize: 12.5,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
};
