import type { EmailCampaignSummary } from "@repo/common";
import {
  CaretDownIcon,
  ChatCenteredTextIcon,
  GitCommitIcon,
} from "@phosphor-icons/react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@frontend/components/ui/collapsible.tsx";

/** The campaign's linked emails, in the order given (oldest first). */
export function CampaignTimeline({
  emails,
}: {
  emails: readonly EmailCampaignSummary[];
}) {
  return (
    <section aria-label="Timeline" data-testid="campaign-timeline">
      {/* Figma's timeline mark: a speech bubble over a ring on a line, one
          40×40 mark centered on the timeline. Phosphor pads its icons, so
          each is drawn at 28px to match the Figma's size. */}
      <div aria-hidden className="text-primary relative ml-[5.5rem] size-10">
        <ChatCenteredTextIcon className="absolute top-0 left-1/2 size-7 -translate-x-1/2" />
        <GitCommitIcon className="absolute top-5 left-1/2 size-7 -translate-x-1/2" />
      </div>
      {emails.length === 0 ? (
        <p
          data-testid="timeline-empty"
          className="text-muted-foreground border-foreground ml-[6.75rem] border-l py-10 pl-8"
        >
          No emails in this campaign yet.
        </p>
      ) : (
        <div className="relative">
          {/* The line runs through the center of the 24px dots. */}
          <span
            aria-hidden
            className="bg-foreground absolute top-0 bottom-0 left-[6.75rem] w-px"
          />
          <ol>
            {emails.map((email) => (
              <TimelineEmail key={email.emailCampaignId} email={email} />
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function TimelineEmail({ email }: { email: EmailCampaignSummary }) {
  const sentAt = new Date(email.sentAt);

  return (
    <li
      data-testid="timeline-email"
      className="relative grid grid-cols-[5.25rem_3rem_1fr] items-start py-6"
    >
      <time dateTime={email.sentAt} className="pt-3">
        <span className="block text-xl leading-none font-bold">
          {sentAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
        <span className="mt-1.25 block text-lg leading-none">
          {sentAt.getFullYear()}
        </span>
      </time>
      <span
        aria-hidden
        className="bg-primary relative z-10 mt-3.5 size-6 justify-self-center rounded-full"
      />
      {/* ml-3 puts the card 24px from the dot, which stays centered on the
          line in its own column. */}
      <Collapsible className="group/item ml-3 border bg-card">
        <CollapsibleTrigger className="flex h-12 w-full cursor-pointer items-center gap-2 pr-2.5 pl-3 text-left">
          <CaretDownIcon
            aria-hidden
            weight="bold"
            className="text-primary size-3 shrink-0 transition-transform group-data-[state=open]/item:rotate-180"
          />
          <span className="flex-1 truncate text-xl leading-[1.625rem] font-bold">
            {email.name}
          </span>
          <span className="rounded-full border px-2 py-0.5 text-base leading-[1.3125rem]">
            Email
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {/* Stand-in boxes until the email's metrics are decided. */}
          <div
            data-testid="timeline-email-stats"
            className="grid h-76 grid-cols-[minmax(0,3fr)_minmax(0,7fr)] gap-3 p-6 pt-3"
          >
            <StatBox label="Recipients" />
            <StatBox label="Unique opens · Unique clicks" />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

function StatBox({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-[0.875rem] border p-6 text-center">
      <span className="text-3xl font-semibold">—</span>
      <span className="text-muted-foreground text-sm">{label}</span>
    </div>
  );
}
