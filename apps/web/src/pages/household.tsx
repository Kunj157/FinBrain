import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!household) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-emerald-400" />
          <h1 className="text-2xl font-bold text-white">Household</h1>
        </div>
        <p className="text-gray-400">Share budgets, goals, and financial tracking with a partner.</p>

        {msg && (
          <div className={`p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {msg.text}
          </div>
        )}

        <Card className="p-6 space-y-6 bg-gray-900/60 border-gray-800">
          <h2 className="text-lg font-semibold text-white">Create a Household</h2>
          <p className="text-sm text-gray-400">You'll be the owner and can invite one partner to join.</p>
          <div className="flex gap-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Our Household"
              className="bg-gray-800 border-gray-700 text-white"
            />
            <Button onClick={createHousehold} disabled={creating || !newName.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              Create
            </Button>
          </div>
        </Card>

        <Card className="p-6 space-y-6 bg-gray-900/60 border-gray-800">
          <h2 className="text-lg font-semibold text-white">Join a Household</h2>
          <p className="text-sm text-gray-400">Enter the invite token shared by the household owner.</p>
          <div className="flex gap-3">
            <Input
              value={joinToken}
              onChange={(e) => setJoinToken(e.target.value)}
              placeholder="Paste invite token"
              className="bg-gray-800 border-gray-700 text-white"
            />
            <Button onClick={joinHousehold} disabled={joining || !joinToken.trim()}>
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Join
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const isOwner = household.myRole === 'OWNER';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-emerald-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">{household.name}</h1>
            <p className="text-sm text-gray-400">
              {household.members.length} member{household.members.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={leaveHousehold} disabled={deleting}>
          <Trash2 className="h-4 w-4 mr-1" />
          {isOwner ? 'Delete' : 'Leave'}
        </Button>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
          {msg.text}
        </div>
      )}

      <Card className="p-6 bg-gray-900/60 border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">Members</h2>
        <div className="space-y-3">
          {household.members.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                  {m.user.avatarUrl ? (
                    <img src={m.user.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <User className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="text-white font-medium">{m.user.name}</p>
                  <p className="text-xs text-gray-400">{m.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {m.role === 'OWNER' && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                    <Shield className="h-3 w-3" /> Owner
                  </span>
                )}
                {isOwner && m.role !== 'OWNER' && (
                  <Button variant="ghost" size="sm" onClick={() => removeMember(m.id)}>
                    <LogOut className="h-4 w-4 text-red-400" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {isOwner && (
        <Card className="p-6 bg-gray-900/60 border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4">Invite Partner</h2>
          <p className="text-sm text-gray-400 mb-4">
            Your household supports 2 members. Send an invite to your partner.
          </p>
          {inviteToken ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
                <code className="flex-1 text-sm text-emerald-400 break-all">{inviteToken}</code>
                <Button variant="ghost" size="sm" onClick={copyToken}>
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-gray-400" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
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
                className="bg-gray-800 border-gray-700 text-white"
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
