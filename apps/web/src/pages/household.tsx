import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton, CardSkeleton } from '@/components/ui/skeleton';
import { Users, Copy, Check, Loader2, UserPlus, LogOut, Trash2, Shield, User } from 'lucide-react';

interface Household {
  id: string;
  name: string;
  myRole: string;
  members: Array<{
    id: string;
    userId: string;
    role: string;
    user: { id: string; name: string; email: string; avatarUrl: string | null };
  }>;
  invites: Array<{
    id: string;
    email: string;
    invitedBy: { id: string; name: string };
  }>;
}

export default function HouseholdPage() {
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteToken, setInviteToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [joinToken, setJoinToken] = useState('');
  const [joining, setJoining] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { loadHousehold(); }, []);

  function show(type: 'success' | 'error', text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  async function loadHousehold() {
    try {
      const res = await api.get('/households');
      setHousehold(res.data.data);
    } catch { /* no household yet */ }
    setLoading(false);
  }

  async function createHousehold() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/households', { name: newName.trim() });
      setHousehold(res.data.data);
      setNewName('');
      show('success', 'Household created!');
    } catch (e: unknown) {
      const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create';
      show('error', err);
    }
    setCreating(false);
  }

  async function inviteMember() {
    if (!inviteEmail.trim() || !household) return;
    setInviting(true);
    try {
      const res = await api.post('/households/invite', { email: inviteEmail.trim(), householdId: household.id });
      setInviteToken(res.data.data.token);
      setInviteEmail('');
    } catch (e: unknown) {
      const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to invite';
      show('error', err);
    }
    setInviting(false);
  }

  async function joinHousehold() {
    if (!joinToken.trim()) return;
    setJoining(true);
    try {
      const res = await api.post('/households/join', { token: joinToken.trim() });
      show('success', `Joined ${res.data.data.name}!`);
      setJoinToken('');
      loadHousehold();
    } catch (e: unknown) {
      const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to join';
      show('error', err);
    }
    setJoining(false);
  }

  async function leaveHousehold() {
    if (!household) return;
    setDeleting(true);
    try {
      await api.delete(`/households/${household.id}`);
      setHousehold(null);
      show('success', 'Left household');
    } catch (e: unknown) {
      const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to leave';
      show('error', err);
    }
    setDeleting(false);
  }

  async function removeMember(memberId: string) {
    if (!household) return;
    try {
      await api.delete(`/households/${household.id}/members/${memberId}`);
      loadHousehold();
      show('success', 'Member removed');
    } catch (e: unknown) {
      const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to remove';
      show('error', err);
    }
  }

  function copyToken() {
    navigator.clipboard.writeText(inviteToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6" aria-busy="true" aria-label="Loading household">
        <Skeleton className="h-10 w-56" />
        <CardSkeleton lines={3} />
        <CardSkeleton lines={2} />
      </div>
    );
  }

  if (!household) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader icon={Users} title="Household" description="Share budgets, goals, and financial tracking with a partner." />

        {msg && (
          <div role="status" className={`rounded-xl border p-3 text-sm ${msg.type === 'success' ? 'border-positive/20 bg-positive/10 text-positive' : 'border-negative/20 bg-negative/10 text-negative'}`}>
            {msg.text}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-4 p-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20"><Users className="h-5 w-5" aria-hidden /></span>
          <div>
            <h2 className="text-base font-semibold tracking-tight">Create a Household</h2>
            <p className="mt-1 text-sm text-muted-foreground">You'll be the owner and can invite one partner to join.</p>
          </div>
          <div className="flex gap-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Our Household"
            />
            <Button onClick={createHousehold} disabled={creating || !newName.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              Create
            </Button>
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-inset ring-accent/20"><UserPlus className="h-5 w-5" aria-hidden /></span>
          <div>
            <h2 className="text-base font-semibold tracking-tight">Join a Household</h2>
            <p className="mt-1 text-sm text-muted-foreground">Enter the invite token shared by the household owner.</p>
          </div>
          <div className="flex gap-3">
            <Input
              value={joinToken}
              onChange={(e) => setJoinToken(e.target.value)}
              placeholder="Paste invite token"
            />
            <Button onClick={joinHousehold} disabled={joining || !joinToken.trim()}>
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Join
            </Button>
          </div>
        </Card>
        </div>
      </div>
    );
  }

  const isOwner = household.myRole === 'OWNER';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        icon={Users}
        eyebrow="Household"
        title={household.name}
        description={`${household.members.length} member${household.members.length !== 1 ? 's' : ''}`}
        actions={
          <Button variant="destructive" size="sm" onClick={leaveHousehold} disabled={deleting}>
            <Trash2 className="h-4 w-4" />
            {isOwner ? 'Delete' : 'Leave'}
          </Button>
        }
      />

      {msg && (
        <div role="status" className={`rounded-xl border p-3 text-sm ${msg.type === 'success' ? 'border-positive/20 bg-positive/10 text-positive' : 'border-negative/20 bg-negative/10 text-negative'}`}>
          {msg.text}
        </div>
      )}

      <Card className="p-6">
        <h2 className="mb-4 text-base font-semibold tracking-tight">Members</h2>
        <div className="space-y-3">
          {household.members.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl border bg-surface-sunken/40 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary/20 to-accent/20 ring-1 ring-inset ring-border">
                  {m.user.avatarUrl ? (
                    <img src={m.user.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{m.user.name}</p>
                  <p className="text-xs text-muted-foreground">{m.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {m.role === 'OWNER' && (
                  <Badge variant="default"><Shield className="h-3 w-3" aria-hidden /> Owner</Badge>
                )}
                {isOwner && m.role !== 'OWNER' && (
                  <Button variant="ghost" size="sm" onClick={() => removeMember(m.id)} aria-label={`Remove ${m.user.name}`}>
                    <LogOut className="h-4 w-4 text-negative" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {isOwner && (
        <Card className="p-6">
          <h2 className="mb-1 text-base font-semibold tracking-tight">Invite Partner</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Your household supports 2 members. Send an invite to your partner.
          </p>
          {inviteToken ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/[0.06] p-3">
                <code className="flex-1 text-sm text-primary break-all">{inviteToken}</code>
                <Button variant="ghost" size="sm" onClick={copyToken} aria-label={copied ? 'Copied' : 'Copy invite token'}>
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this token with your partner. It expires in 7 days.
              </p>
              <Button variant="outline" size="sm" onClick={() => { setInviteToken(''); setCopied(false); }}>
                Invite another
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Partner's email address"
                />
              <Button onClick={inviteMember} disabled={inviting || !inviteEmail.trim()}>
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Invite
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
