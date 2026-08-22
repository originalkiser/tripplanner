import { useState } from 'react'
import type { Poll } from '../../stores/pollsStore'
import { usePollsStore } from '../../stores/pollsStore'
import { useAuthStore } from '../../stores/authStore'

function formatOption(o: Poll['options'][number]): string {
  if (!o.proposed_date) return 'Other time'
  // Postgres `time` comes back as HH:MM:SS — trim to HH:MM before building
  // an ISO-ish string, or the extra :00 makes Date parsing fail silently.
  const time = (o.proposed_time ?? '00:00').slice(0, 5)
  const d = new Date(`${o.proposed_date}T${time}:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
    (o.proposed_time ? ` · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : '')
}

export function PollSection({
  poll,
  compact,
  onVoted,
}: {
  poll: Poll
  compact?: boolean
  onVoted?: () => void
}) {
  const profile = useAuthStore((s) => s.profile)
  const { vote, voteNotInterested, proposeOther } = usePollsStore()
  const [proposing, setProposing] = useState(false)
  const [otherDate, setOtherDate] = useState('')
  const [otherTime, setOtherTime] = useState('')
  const [busy, setBusy] = useState(false)

  const myVote = profile ? poll.votes.find((v) => v.user_id === profile.id) : undefined

  async function handleVote(optionId: string) {
    if (!profile) return
    setBusy(true)
    await vote(poll.id, profile.id, optionId)
    setBusy(false)
    onVoted?.()
  }

  async function handleNotInterested() {
    if (!profile) return
    setBusy(true)
    await voteNotInterested(poll.id, profile.id)
    setBusy(false)
    onVoted?.()
  }

  async function handleProposeOther(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !otherDate || !otherTime) return
    setBusy(true)
    await proposeOther(poll.id, profile.id, otherDate, otherTime)
    setBusy(false)
    setProposing(false)
    setOtherDate('')
    setOtherTime('')
    onVoted?.()
  }

  const votesByOption = (optionId: string) => poll.votes.filter((v) => v.option_id === optionId)

  return (
    <div className={compact ? '' : 'rounded-lg bg-secondary/10 p-3'}>
      {!compact && <p className="mb-2 text-xs font-medium text-text-dim">Time poll</p>}
      <div className="flex flex-col gap-2">
        {poll.options.map((opt) => {
          const optVotes = votesByOption(opt.id)
          const mine = myVote?.option_id === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              disabled={busy}
              onClick={() => void handleVote(opt.id)}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm disabled:opacity-50 ${
                mine ? 'bg-primary text-white' : 'bg-surface'
              }`}
            >
              <span>
                {formatOption(opt)}
                {opt.is_other && opt.proposed_by && <span className="ml-1 text-xs opacity-70">(proposed)</span>}
              </span>
              {optVotes.length > 0 && (
                <span className={`text-xs ${mine ? 'opacity-90' : 'text-text-dim'}`}>{optVotes.length}</span>
              )}
            </button>
          )
        })}

        <button
          type="button"
          disabled={busy}
          onClick={() => void handleNotInterested()}
          className={`rounded-lg px-3 py-2 text-left text-sm disabled:opacity-50 ${
            myVote?.not_interested ? 'bg-text-dim text-white' : 'bg-surface text-text-dim'
          }`}
        >
          Not interested
        </button>

        {!proposing ? (
          <button
            type="button"
            onClick={() => setProposing(true)}
            className="self-start text-xs text-primary underline"
          >
            + Propose a different time
          </button>
        ) : (
          <form onSubmit={handleProposeOther} className="flex gap-2">
            <input
              type="date"
              required
              value={otherDate}
              onChange={(e) => setOtherDate(e.target.value)}
              className="flex-1 rounded-lg border border-line bg-bg px-2 py-1 text-sm"
            />
            <input
              type="time"
              required
              value={otherTime}
              onChange={(e) => setOtherTime(e.target.value)}
              className="flex-1 rounded-lg border border-line bg-bg px-2 py-1 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-primary px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
