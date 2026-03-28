# Design an AI Agent that Books Meetings and Sends Emails
> Part 21 — Generative AI for Full Stack Engineers · GenAI System Design
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **This is the canonical agentic workflow**: multi-step, tool-using, requires reasoning across multiple API calls — calendar check → slot selection → event creation → email send; perfectly illustrates the ReAct loop
- **Four tools the agent needs (and only these four)**: `getAvailableSlots(participantEmails, duration, rangeStart, rangeEnd)`, `createCalendarEvent(title, startTime, attendees, location)`, `sendEmail(to, subject, body)`, `getUserPreferences(userId)` — principle of least privilege: no cancellation, no deletion, no reading email contents
- **Confirmation before irreversible actions**: calendar event creation and email send are irreversible (once an email is sent, it's sent); always stage both actions first, present a summary to the user, then execute on explicit confirmation; this is the human-in-the-loop pattern for agentic workflows
- **Multi-participant availability is the hard part**: call `getAvailableSlots` for all participants simultaneously, intersect the free windows, filter by preferences (morning vs afternoon, timezone), present top 3 options; this is multi-step reasoning the LLM must do across tool data
- **Security critical points**: OAuth token for calendar/email tools is scoped to the requesting user — the agent cannot book meetings on behalf of someone else's calendar; validate that `createCalendarEvent.attendees` only contains the authorised user + people they're allowed to invite; tool call arguments must be validated before execution
- **Why Spring AI + max_iterations(8)**: calendar booking typically takes 3-5 tool calls; set max 8 with a loop detector; if it exceeds 5 turns without a staged confirmation, log and break with partial result

---

## 1. Agentic Flow Trace (ReAct Pattern)

```
User: "Book a 30-minute meeting with alice@co.com and bob@co.com 
       for this Thursday, morning preferred"

Thought: I need to find available slots for all participants
Action: getAvailableSlots(
  participants=["alice@co.com", "bob@co.com", "hruday@co.com"],
  duration=30,
  rangeStart="2025-01-16T00:00:00Z",  // Thursday
  rangeEnd="2025-01-16T23:59:59Z"
)
Observation: [
  {start: "09:00", end: "09:30"},
  {start: "10:00", end: "10:30"},
  {start: "14:00", end: "14:30"}
]

Thought: User prefers morning — offer 09:00 and 10:00 options
Action: getUserPreferences(userId="hruday@co.com")
Observation: {preferredMeetingTime: "morning", maxMeetingsPerDay: 5, timezone: "IST"}

Thought: Stage the booking for user confirmation. Present top 2 morning slots.
Action: stageBooking(
  options: ["09:00-09:30 IST", "10:00-10:30 IST"],
  participants: ["alice@co.com", "bob@co.com"],
  duration: 30
)
Observation: {stagedId: "stage-abc-123", confirmationRequired: true}

Response to user:
"I found 2 morning slots on Thursday:
1. 9:00 - 9:30 AM IST
2. 10:00 - 10:30 AM IST

Which would you prefer? I'll send calendar invites to Alice and Bob."

[User: "Option 1 please"]

Thought: User confirmed slot 1. Create event and send invite emails.
Action: createCalendarEvent(
  title="Meeting with Alice and Bob",
  start="2025-01-16T09:00:00+05:30",
  end="2025-01-16T09:30:00+05:30",
  attendees=["alice@co.com", "bob@co.com"],
  conferenceLink=true
)
Observation: {eventId: "evt-987", meetLink: "meet.google.com/xyz-abc"}

Action: sendEmail(
  to=["alice@co.com", "bob@co.com"],
  subject="Meeting Invitation: Thursday 9:00 AM IST",
  body="..."
)
Observation: {sent: true, messageId: "msg-456"}

Response: "Done ✓ Meeting booked for Thursday 9:00-9:30 AM IST. 
Calendar invite sent to Alice and Bob. Meet link: meet.google.com/xyz-abc"
```

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  MEETING BOOKING AGENT                                       │
│                                                             │
│  React UI (chat interface)                                  │
│    → POST /api/agent/meeting                                │
│       ↓                                                     │
│  Spring Boot Agent Controller                              │
│    → Auth + Rate limit (max 5 meeting requests/day/user)   │
│    → InputGuard (injection check)                          │
│       ↓                                                     │
│  ChatClient (Spring AI)                                    │
│    .system(MEETING_AGENT_PROMPT)                           │
│    .user(userMessage)                                      │
│    .tools(calendarTools, emailTools, preferencesTools)     │
│    .maxIterations(8)                                       │
│       ↓                                                     │
│  Tool execution (inside Spring AI ReAct loop)             │
│    CalendarTools → Google Calendar API / Microsoft Graph   │
│    EmailTools → Gmail API / Exchange                       │
│    Each tool: OAuth-scoped to the requesting user          │
│       ↓                                                     │
│  Confirmation gate (before irreversible actions)           │
│    stageBooking() → present to user → confirmBooking()     │
│       ↓                                                     │
│  Response → SSE stream → React UI                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Tool Implementation

```java
@Component
public class CalendarTools {

    private final GoogleCalendarClient googleCalendar;
    private final SecurityContext securityContext;
    
    @Tool(description = """
        Find available meeting slots for a list of participants.
        Returns a list of time windows when ALL participants are free.
        Duration is in minutes. RangeStart and rangeEnd are ISO-8601 UTC timestamps.
        """)
    public List<TimeSlot> getAvailableSlots(
        @ToolParam(description = "List of participant email addresses") List<String> participantEmails,
        @ToolParam(description = "Meeting duration in minutes (e.g., 30, 60)") int durationMinutes,
        @ToolParam(description = "Search range start, ISO-8601 UTC") String rangeStart,
        @ToolParam(description = "Search range end, ISO-8601 UTC") String rangeEnd
    ) {
        // Security: inject the requesting user's OAuth token — not from LLM args
        String userEmail = securityContext.getCurrentUserEmail();
        String accessToken = oauthTokenService.getCalendarToken(userEmail);
        
        return googleCalendar.findFreeSlots(
            participantEmails, durationMinutes, rangeStart, rangeEnd, accessToken
        );
    }
    
    @Tool(description = """
        Stage a calendar event for user confirmation.
        This does NOT create the event — it returns a staged booking ID.
        The user must confirm before the event is created.
        Use this BEFORE createCalendarEvent.
        """)
    public StagedBooking stageCalendarEvent(
        @ToolParam(description = "Meeting title") String title,
        @ToolParam(description = "Start time, ISO-8601") String startTime,
        @ToolParam(description = "End time, ISO-8601") String endTime,
        @ToolParam(description = "Attendee email addresses") List<String> attendeeEmails
    ) {
        // Validate: attendees must be in the user's allowed contact list
        String userEmail = securityContext.getCurrentUserEmail();
        validateAttendees(attendeeEmails, userEmail);
        
        String stageId = pendingActionStore.stage(new PendingCalendarEvent(
            title, startTime, endTime, attendeeEmails, userEmail
        ));
        
        return new StagedBooking(stageId, title, startTime, endTime, attendeeEmails);
    }
    
    @Tool(description = "Confirm and execute a staged calendar event. Requires the stageId returned by stageCalendarEvent.")
    public CreatedEvent confirmAndCreateEvent(
        @ToolParam(description = "Stage ID from stageCalendarEvent") String stageId
    ) {
        PendingCalendarEvent pending = pendingActionStore.get(stageId);
        if (pending == null) return CreatedEvent.notFound(stageId);
        
        String accessToken = oauthTokenService.getCalendarToken(pending.organizerEmail());
        CreatedEvent event = googleCalendar.createEvent(pending, accessToken);
        
        pendingActionStore.remove(stageId);
        auditLog.record("CALENDAR_EVENT_CREATED", pending.organizerEmail(), event.eventId());
        return event;
    }
}
```

---

## 4. Wrong Way vs Right Way

```java
// ❌ Agent creates event and sends email without confirmation
// → User accidentally books wrong day (Thursday vs Friday)
// → Email to 10 people already sent; embarrassing withdrawal

// ❌ Agent uses user-supplied OAuth token from request body
// → Attacker passes another user's token → books as that user
```

```java
// ✅ Stage → confirm → execute pattern
// stageCalendarEvent() always precedes createCalendarEvent()
// Agent cannot skip the confirmation step

// ✅ OAuth token always fetched server-side from the requesting user's session
String accessToken = oauthTokenService.getCalendarToken(
    securityContext.getCurrentUserEmail()  // NEVER from LLM output
);
```

---

## 5. Scale Evolution

**Prototype →** Spring AI ChatClient + `@Tool` methods; hardcoded Google Calendar; manual confirmation in chat.

**Production →** OAuth token management per user; staged booking pattern; rate limit (5 bookings/day/user); audit log on every created/confirmed/cancelled event.

**High scale →** Multi-provider calendar (Google + Microsoft Graph via adapter); scheduling AI microservice behind API gateway; Kafka for async calendar sync (for large org calendars with cross-timezone lookups); agent session stored in Redis (resume multi-turn booking if user disconnects).

---

## 6. Company Relevance

| Company | Meeting agent relevance | Interview signal |
|---------|------------------------|-----------------|
| Razorpay / PhonePe | Internal operations — schedule calls with merchants automatically | Audit log + confirmation gate for any external email send |
| Swiggy / Meesho | Vendor meeting coordination at scale | Multi-timezone availability; stage → confirm → execute |
| Adobe / Microsoft | Microsoft Graph API integration; Teams meeting creation | Microsoft Graph tool; OAuth delegated flow |
| SAP Labs | SAP Joule (AI assistant) integration; calendar booking in enterprise workflow | Multi-participant cross-org availability; enterprise OAuth flow |

---

## 7. Interview Questions & Model Answers

### Q1 — Design an AI agent that books meetings
**Hruday:**
> "The core flow is five tools: `getAvailableSlots` queries the calendar APIs for all participants and returns intersection windows; `getUserPreferences` retrieves timezone and meeting time preferences; `stageBooking` presents the options — it doesn't book yet, it just stages the action and returns a confirmation prompt; `confirmBooking` executes after user approval; and `sendEmail` sends the invites. The agent runs the ReAct loop with `maxIterations(8)`. The critical design decision is the confirmation gate: calendar creation and email send are irreversible, so the agent always stages first and presents options before executing. On security: OAuth tokens are fetched server-side from the requesting user's session, never from LLM-generated arguments — this prevents any injection attack from escalating to booking on behalf of someone else. Every created event is written to an audit log with the organiser's userId, timestamp, and attendee list."

---

*Part 21 · Design an AI Agent that Books Meetings and Sends Emails · Full Stack Interview Guide · Hruday D · 2026*
