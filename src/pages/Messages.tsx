import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  subscribeMyConversations,
  subscribeConversationMessages,
  getOrCreateConversation,
  sendInternalMessage,
  markMessageRead,
  markConversationRead,
  isConversationUnread,
  emailKey,
  editMessage,
  deleteMessage,
  hardDeleteMessage,
  deleteConversation,
  togglePinMessage,
  toggleReaction,
  setArchived,
  searchMyMessages,
  type Conversation,
  type InternalMessage,
} from '../firebase/messages';
import { subscribeAgents, type Agent } from '../firebase/agents';
import { lookupTicketIdByCode } from '../firebase/tickets';
import { uploadAttachments } from '../firebase/attachments';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../components/Icon';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

function fmt(ts: InternalMessage['createdAt']) {
  if (!ts) return '';
  return ts.toDate().toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function renderBody(body: string, agents: Agent[]) {
  const names = agents.map((a) => a.name).filter(Boolean);
  if (names.length === 0) return body;
  const parts = body.split(/(@[\p{L}0-9._-]+(?:\s[\p{L}0-9._-]+)?)/gu);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const candidate = part.slice(1);
      const isMention = names.some((n) => n.toLowerCase() === candidate.toLowerCase());
      if (isMention) {
        return (
          <span key={i} style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
            {part}
          </span>
        );
      }
    }
    return part;
  });
}

export function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const myEmail = user?.email?.toLowerCase() ?? '';
  const [agents, setAgents] = useState<Agent[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeSelected, setComposeSelected] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [draft, setDraft] = useState('');
  const [attachCode, setAttachCode] = useState('');
  const [attached, setAttached] = useState<{ code: string; id: string } | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<(InternalMessage & { conversationId: string })[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => subscribeAgents(setAgents), []);
  useEffect(() => {
    if (!myEmail) return;
    return subscribeMyConversations(myEmail, setConversations);
  }, [myEmail]);
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    return subscribeConversationMessages(selectedId, setMessages);
  }, [selectedId]);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2 || !myEmail) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const id = setTimeout(() => {
      searchMyMessages(myEmail, q)
        .then(setSearchResults)
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(id);
  }, [search, myEmail]);

  const myName = useMemo(
    () => agents.find((a) => a.email?.toLowerCase() === myEmail)?.name ?? user?.email?.split('@')[0] ?? 'Ja',
    [agents, myEmail, user],
  );

  const otherAgents = agents.filter((a) => a.email && a.email.toLowerCase() !== myEmail && a.active !== false);

  const visibleConversations = useMemo(() => {
    let list = conversations.filter((c) => (showArchived ? c.archivedBy.includes(myEmail) : !c.archivedBy.includes(myEmail)));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => conversationTitle(c, myEmail).toLowerCase().includes(q));
    }
    return list;
  }, [conversations, showArchived, myEmail, search]);

  function conversationTitle(c: Conversation, me: string) {
    if (c.groupTitle) return c.groupTitle;
    if (c.isGroup) {
      return c.participants
        .filter((p) => p !== me)
        .map((p) => c.participantNames[p] ?? p)
        .join(', ');
    }
    const other = c.participants.find((p) => p !== me);
    return other ? c.participantNames[other] ?? other : 'Ja';
  }

  const active = conversations.find((c) => c.id === selectedId) ?? null;
  const composing = selectedId === null;

  function openConversation(id: string) {
    setSelectedId(id);
    setSearch('');
    setSearchResults([]);
    markConversationRead(id, myEmail);
  }

  useEffect(() => {
    if (!selectedId || !myEmail) return;
    messages.filter((m) => !m.readBy.includes(myEmail)).forEach((m) => markMessageRead(selectedId, m.id, myEmail));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, selectedId, myEmail]);

  function toggleComposeRecipient(email: string) {
    setComposeSelected((prev) => (prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]));
  }

  async function handleAttachTicket() {
    if (!attachCode.trim()) return;
    setAttaching(true);
    setAttachError(null);
    try {
      const id = await lookupTicketIdByCode(attachCode.trim());
      if (!id) {
        setAttachError('Tiket sa nenašiel.');
        return;
      }
      setAttached({ code: attachCode.trim().toUpperCase(), id });
      setAttachCode('');
    } finally {
      setAttaching(false);
    }
  }

  function extractMentions(body: string): string[] {
    const matches = body.match(/@[\p{L}0-9._-]+(?:\s[\p{L}0-9._-]+)?/gu) ?? [];
    const emails = new Set<string>();
    matches.forEach((m) => {
      const candidate = m.slice(1).toLowerCase();
      const agent = agents.find((a) => a.name.toLowerCase() === candidate);
      if (agent?.email) emails.add(agent.email.toLowerCase());
    });
    return [...emails];
  }

  async function ensureConversation(): Promise<string> {
    if (selectedId) return selectedId;
    const recipients = composeSelected
      .map((email) => otherAgents.find((a) => a.email?.toLowerCase() === email))
      .filter((a): a is Agent => Boolean(a));
    const participants = [{ email: myEmail, name: myName }, ...recipients.map((a) => ({ email: a.email!.toLowerCase(), name: a.name }))];
    const id = await getOrCreateConversation(participants, composeSelected.length > 1 ? groupTitle.trim() || undefined : undefined);
    return id;
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() && !attached) return;
    if (composing && composeSelected.length === 0) return;
    const convId = await ensureConversation();
    await sendInternalMessage(convId, {
      fromEmail: myEmail,
      fromName: myName,
      body: draft.trim(),
      ticketCode: attached?.code,
      ticketId: attached?.id,
      mentions: extractMentions(draft),
    });
    setDraft('');
    setAttached(null);
    setComposeSelected([]);
    setGroupTitle('');
    setSelectedId(convId);
  }

  async function handleFilePick(files: FileList | null) {
    if (!files || files.length === 0) return;
    const convId = await ensureConversation();
    setUploadingFile(true);
    try {
      const attachments = await uploadAttachments(`conversations/${convId}`, Array.from(files));
      await sendInternalMessage(convId, { fromEmail: myEmail, fromName: myName, body: '', attachments });
      setSelectedId(convId);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Nahrávanie súboru zlyhalo.');
    } finally {
      setUploadingFile(false);
    }
  }

  function startEdit(m: InternalMessage) {
    setEditingId(m.id);
    setEditDraft(m.body);
  }

  async function saveEdit(m: InternalMessage) {
    if (!selectedId || !editDraft.trim()) return;
    await editMessage(selectedId, m.id, editDraft.trim());
    setEditingId(null);
  }

  async function handleDelete(m: InternalMessage) {
    if (!selectedId) return;
    if (!window.confirm('Naozaj chcete zmazať túto správu?')) return;
    await deleteMessage(selectedId, m.id);
  }

  async function handleHardDelete(m: InternalMessage) {
    if (!selectedId) return;
    if (!window.confirm('Natrvalo odstrániť túto správu? Toto sa už nedá vrátiť späť.')) return;
    await hardDeleteMessage(selectedId, m.id);
  }

  async function handleDeleteConversation() {
    if (!active) return;
    if (!window.confirm(`Natrvalo zmazať celú konverzáciu s ${conversationTitle(active, myEmail)}? Zmizne aj druhej strane a nedá sa to vrátiť späť.`)) {
      return;
    }
    await deleteConversation(active.id);
    setSelectedId(null);
  }

  async function handleReact(m: InternalMessage, emoji: string) {
    if (!selectedId) return;
    const current = m.reactions?.[emailKey(myEmail)];
    await toggleReaction(selectedId, m.id, myEmail, current === emoji ? null : emoji);
    setReactionPickerFor(null);
  }

  async function toggleArchive(c: Conversation, e: React.MouseEvent) {
    e.stopPropagation();
    await setArchived(c.id, myEmail, !c.archivedBy.includes(myEmail));
    if (selectedId === c.id) setSelectedId(null);
  }

  const pinnedMessages = messages.filter((m) => m.pinned && !m.deleted);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Správy</h1>
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 13.5 }}>
          Interné správy medzi technikmi - jednotlivo aj v skupine, s pripojením tiketu, reakciami a zmienkami (@Meno).
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 14, height: 620 }}>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 10, borderBottom: '1px solid var(--color-border)', display: 'flex', gap: 6 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Icon name="search" size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Hľadať konverzácie a správy…"
                style={{ width: '100%', padding: '7px 9px 7px 26px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', fontSize: 12 }}
              />
            </div>
            <button
              onClick={() => setShowArchived((v) => !v)}
              title="Archivované konverzácie"
              style={{ padding: '0 9px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: showArchived ? 'var(--color-primary-bg)' : 'var(--color-surface)', color: showArchived ? 'var(--color-primary)' : 'var(--color-text-muted)', cursor: 'pointer' }}
            >
              <Icon name="archive" size={13} />
            </button>
          </div>

          {search.trim().length >= 2 ? (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {searching && <div style={{ padding: 16, fontSize: 12, color: 'var(--color-text-faint)' }}>Hľadám…</div>}
              {!searching && searchResults.length === 0 && (
                <div style={{ padding: 16, fontSize: 12, color: 'var(--color-text-faint)' }}>Žiadne výsledky v obsahu správ.</div>
              )}
              {searchResults.map((r) => {
                const conv = conversations.find((c) => c.id === r.conversationId);
                return (
                  <button
                    key={r.id}
                    onClick={() => openConversation(r.conversationId)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 12.5 }}>{conv ? conversationTitle(conv, myEmail) : '—'}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 2 }}>{r.fromName}: {r.body}</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <button
                onClick={() => setSelectedId(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '12px 14px',
                  background: composing ? 'var(--color-primary-bg)' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 13,
                  color: 'var(--color-primary)',
                }}
              >
                <Icon name="plus" size={14} /> Nová správa
              </button>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {visibleConversations.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', fontSize: 12.5, color: 'var(--color-text-faint)' }}>
                    {showArchived ? 'Žiadne archivované konverzácie.' : 'Zatiaľ žiadne správy.'}
                  </div>
                )}
                {visibleConversations.map((c) => {
                  const unread = isConversationUnread(c, myEmail);
                  return (
                    <div
                      key={c.id}
                      onClick={() => openConversation(c.id)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 14px',
                        background: selectedId === c.id ? 'var(--color-primary-bg)' : 'transparent',
                        borderBottom: '1px solid var(--color-border)',
                        cursor: 'pointer',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: 13 }}>
                          {c.isGroup && <Icon name="users" size={12} style={{ color: 'var(--color-text-faint)' }} />}
                          {conversationTitle(c, myEmail)}
                        </span>
                        <button
                          onClick={(e) => toggleArchive(c, e)}
                          title={showArchived ? 'Obnoviť' : 'Archivovať'}
                          style={{ background: 'none', border: 'none', color: 'var(--color-text-faint)', cursor: 'pointer', padding: 2 }}
                        >
                          <Icon name="archive" size={12} />
                        </button>
                      </div>
                      <div style={{ fontSize: 11.5, color: unread ? 'var(--color-text)' : 'var(--color-text-muted)', fontWeight: unread ? 700 : 400, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.lastMessagePreview || '—'}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--color-text-faint)', marginTop: 2 }}>{fmt(c.lastMessageAt)}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {composing && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 6 }}>Komu (vyberte jedného alebo viacerých)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: composeSelected.length > 1 ? 8 : 0 }}>
                {otherAgents.map((a) => {
                  const email = a.email!.toLowerCase();
                  const on = composeSelected.includes(email);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleComposeRecipient(email)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 999,
                        border: `1px solid ${on ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        background: on ? 'var(--color-primary-bg)' : 'var(--color-surface)',
                        color: on ? 'var(--color-primary)' : 'var(--color-text)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {a.name}
                    </button>
                  );
                })}
              </div>
              {composeSelected.length > 1 && (
                <input
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder="Názov skupiny (nepovinné)"
                  style={{ width: '100%', padding: '7px 9px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', fontSize: 12 }}
                />
              )}
            </div>
          )}

          {!composing && active && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {active.isGroup && <Icon name="users" size={13} style={{ color: 'var(--color-text-faint)' }} />}
                  {conversationTitle(active, myEmail)}
                </div>
                {active.isGroup && (
                  <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 2 }}>
                    {active.participants.filter((p) => p !== myEmail).map((p) => active.participantNames[p] ?? p).join(', ')}
                  </div>
                )}
              </div>
              <button
                onClick={handleDeleteConversation}
                title="Natrvalo zmazať celú konverzáciu"
                style={{ ...microBtn, color: 'var(--color-danger)', flexShrink: 0 }}
              >
                <Icon name="trash" size={12} /> Zmazať konverzáciu
              </button>
            </div>
          )}

          {pinnedMessages.length > 0 && (
            <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-warning-bg)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {pinnedMessages.map((m) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                  <Icon name="pin" size={11} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600 }}>{m.fromName}:</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{m.body}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {composing && (
              <div style={{ margin: 'auto', color: 'var(--color-text-faint)', fontSize: 13 }}>Vyberte technika (technikov) a napíšte správu.</div>
            )}
            {!composing && messages.length === 0 && (
              <div style={{ margin: 'auto', color: 'var(--color-text-faint)', fontSize: 13 }}>Zatiaľ žiadne správy.</div>
            )}
            {messages.map((m) => {
              const mine = m.fromEmail === myEmail;
              const allRead = active ? active.participants.every((p) => m.readBy.includes(p)) : false;
              const isEditing = editingId === m.id;
              return (
                <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '75%', position: 'relative' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--color-text-faint)', marginBottom: 2, textAlign: mine ? 'right' : 'left' }}>
                    {mine ? 'Vy' : m.fromName} · {fmt(m.createdAt)}
                    {m.edited && !m.deleted && ' · upravené'}
                  </div>

                  {m.deleted ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: 12.5, fontStyle: 'italic', color: 'var(--color-text-faint)', background: 'var(--color-surface-2)' }}>
                      Táto správa bola zmazaná.
                      {mine && (
                        <button
                          onClick={() => handleHardDelete(m)}
                          style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontStyle: 'normal', padding: 0 }}
                        >
                          Zmazať natrvalo
                        </button>
                      )}
                    </div>
                  ) : isEditing ? (
                    <div>
                      <textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        rows={2}
                        style={{ width: '100%', padding: '7px 9px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 12.5 }}
                      />
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditingId(null)} style={miniBtn}>Zrušiť</button>
                        <button onClick={() => saveEdit(m)} style={{ ...miniBtn, background: 'var(--color-primary)', color: '#fff', border: '1px solid var(--color-primary)' }}>Uložiť</button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onMouseEnter={() => {}}
                      style={{
                        background: mine ? 'var(--color-primary)' : 'var(--color-surface-2)',
                        color: mine ? '#fff' : 'var(--color-text)',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 13,
                      }}
                    >
                      {renderBody(m.body, agents)}
                      {m.attachments?.map((a) => (
                        <a
                          key={a.url}
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: m.body ? 6 : 0, fontSize: 11.5, color: 'inherit', textDecoration: 'underline' }}
                        >
                          <Icon name="paperclip" size={11} /> {a.name}
                        </a>
                      ))}
                      {m.ticketCode && (
                        <div
                          onClick={() => navigate(`/tickets/${m.ticketId}`)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            marginTop: 6,
                            padding: '3px 8px',
                            borderRadius: 999,
                            background: mine ? 'rgba(255,255,255,0.2)' : 'var(--color-primary-bg)',
                            color: mine ? '#fff' : 'var(--color-primary)',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <Icon name="ticket" size={11} /> {m.ticketCode}
                        </div>
                      )}
                    </div>
                  )}

                  {!m.deleted && !isEditing && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                      {mine && (
                        <Icon
                          name="checkDouble"
                          size={11}
                          style={{ color: allRead ? 'var(--color-primary)' : 'var(--color-text-faint)' }}
                        />
                      )}
                      <div style={{ position: 'relative' }}>
                        <button onClick={() => setReactionPickerFor(reactionPickerFor === m.id ? null : m.id)} style={microBtn} title="Reagovať">
                          🙂
                        </button>
                        {reactionPickerFor === m.id && (
                          <div style={{ position: 'absolute', top: '110%', left: 0, display: 'flex', gap: 4, padding: 6, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 999, boxShadow: 'var(--shadow-md)', zIndex: 10 }}>
                            {REACTIONS.map((r) => (
                              <button key={r} onClick={() => handleReact(m, r)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>
                                {r}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={() => togglePinMessage(selectedId!, m.id, !m.pinned)} style={{ ...microBtn, color: m.pinned ? 'var(--color-warning)' : 'var(--color-text-faint)' }} title="Pripnúť">
                        <Icon name="pin" size={11} />
                      </button>
                      {mine && (
                        <>
                          <button onClick={() => startEdit(m)} style={{ ...microBtn, color: 'var(--color-text-faint)' }} title="Upraviť">
                            <Icon name="edit" size={11} />
                          </button>
                          <button onClick={() => handleDelete(m)} style={{ ...microBtn, color: 'var(--color-danger)' }} title="Zmazať">
                            <Icon name="trash" size={11} />
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {m.reactions && Object.keys(m.reactions).length > 0 && (
                    <div style={{ display: 'flex', gap: 3, marginTop: 3, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                      {Object.entries(
                        Object.values(m.reactions).reduce<Record<string, number>>((acc, e) => {
                          acc[e] = (acc[e] ?? 0) + 1;
                          return acc;
                        }, {}),
                      ).map(([emoji, count]) => (
                        <span key={emoji} style={{ fontSize: 11, padding: '1px 6px', borderRadius: 999, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                          {emoji} {count > 1 ? count : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSend} style={{ borderTop: '1px solid var(--color-border)', padding: 12 }}>
            {attached ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11.5 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 999, background: 'var(--color-primary-bg)', color: 'var(--color-primary)', fontWeight: 700 }}>
                  <Icon name="ticket" size={11} /> {attached.code}
                </span>
                <button type="button" onClick={() => setAttached(null)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontWeight: 700 }}>
                  ×
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <input
                  value={attachCode}
                  onChange={(e) => setAttachCode(e.target.value)}
                  placeholder="Číslo tiketu na priloženie (napr. TIK000123)"
                  style={{ flex: 1, padding: '6px 9px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', fontSize: 11.5 }}
                />
                <button type="button" onClick={handleAttachTicket} disabled={attaching} style={{ padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
                  <Icon name="ticket" size={12} />
                </button>
              </div>
            )}
            {attachError && <div style={{ fontSize: 11, color: 'var(--color-danger)', marginBottom: 6 }}>{attachError}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="file" id="msg-file-input" multiple onChange={(e) => { handleFilePick(e.target.files); e.target.value = ''; }} style={{ display: 'none' }} />
              <button
                type="button"
                onClick={() => document.getElementById('msg-file-input')?.click()}
                disabled={uploadingFile || (composing && composeSelected.length === 0)}
                title="Priložiť súbor"
                style={{ padding: '0 10px', background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
              >
                <Icon name="paperclip" size={14} />
              </button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Napíšte správu… (@Meno pre zmienku)"
                style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}
              />
              <button
                type="submit"
                disabled={composing && composeSelected.length === 0}
                style={{ padding: '0 18px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, opacity: composing && composeSelected.length === 0 ? 0.6 : 1 }}
              >
                Odoslať
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const miniBtn = {
  padding: '4px 10px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface)',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
} as const;

const microBtn = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 2,
  fontSize: 11,
  display: 'flex',
  alignItems: 'center',
} as const;
