# Releases with a schedule

Research item 1 (CMS research and roadmap, Nov 2026).

## Goal

A launch day (a trade show, a campaign) touches several pages at once: a campaign page, the home
banner, the nav, a blog post, in two languages. The team should be able to prepare all of it, check
it together on one link, set a time for it to go live (and, for campaigns, a time it goes away),
and undo the whole thing in one step if something is wrong.

## Choices

- **A release is a frozen copy of the draft**, built on staging (which already freezes the draft,
  gives it a share link and pushes it to production). A release adds a name, a go-live time and an
  optional end time. One release at a time to start (the same slot as staging).
- **Go-live runs on the server**: a Cron Trigger every 15 minutes (free; no new service) checks the
  release and pushes it exactly as "Push to production" does, signed "Scheduled release". The time
  is set and shown in Cape Town time.
- **End and undo**: when a release goes live, the version that was live before is remembered (its
  commit). At the end time, or when someone presses "Undo release", that version is published
  again. Campaign pages that end on a date already return 410 by themselves (`unpublishAt`); the
  release end is for everything else that changed (home banner, nav).
- **Who**: Managers and Owners schedule and undo (the same as pushing to production).
- **Safety**: if the live site changed after the release was frozen, the scheduled push stops and
  the release says so (as Push does today); nothing is pushed over newer work.

## Checks

- Unit tests for the schedule decision (due, not due, ended, blocked by a newer live site).
- Worker: scheduling, the cron push and the undo, locally with a stub GitHub.
- Editor: set a time, see the countdown, cancel, undo; desktop and 390px.
- The demo: schedules pretend (like publish).
