import type { EmailCampaignSummary } from "@repo/common";
import { CaretDownIcon, ChatCenteredTextIcon } from "@phosphor-icons/react";
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
      <ChatCenteredTextIcon
        aria-hidden
        className="text-primary ml-[5.5rem] size-10"
        weight="regular"
      />
      {emails.length === 0 ? (
        <p
          data-testid="timeline-empty"
          className="text-muted-foreground border-foreground ml-[6.75rem] border-l py-10 pl-8"
        >
          No emails in this campaign yet.
        </p>
      ) : (
        <ol className="relative">
          {/* The line runs through the centre of the 24px dots. */}
          <span
            aria-hidden
            className="bg-foreground absolute top-0 bottom-0 left-[6.75rem] w-px"
          />
          {emails.map((email) => (
            <TimelineEmail key={email.emailCampaignId} email={email} />
          ))}
        </ol>
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
        <span className="block text-xl leading-6 font-bold">
          {sentAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
        <span className="block text-lg leading-[1.375rem]">
          {sentAt.getFullYear()}
        </span>
      </time>
      <span
        aria-hidden
        className="bg-primary relative z-10 mt-3.5 size-6 justify-self-center rounded-full"
      />
      <Collapsible className="group/item border bg-card">
        <CollapsibleTrigger className="flex h-[3.1875rem] w-full cursor-pointer items-center gap-2 px-3 text-left">
          <CaretDownIcon
            aria-hidden
            weight="fill"
            className="text-primary size-4 shrink-0 transition-transform group-data-[state=open]/item:rotate-180"
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
            className="grid grid-cols-[minmax(0,3fr)_minmax(0,7fr)] gap-3 p-6 pt-3"
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
    <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-[0.875rem] border p-6 text-center">
      <span className="text-3xl font-semibold">—</span>
      <span className="text-muted-foreground text-sm">{label}</span>
    </div>
  );
}
