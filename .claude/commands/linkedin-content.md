# LinkedIn Content Writing Skill

Write high-performing LinkedIn content for the user based on their topic, goal, and audience.

## How to use

When the user invokes `/linkedin-content`, ask them for:
1. **Topic** — what they want to post about (e.g., a project milestone, an insight, a lesson learned, a product launch)
2. **Goal** — what they want readers to do or feel (e.g., start a conversation, drive profile visits, showcase expertise, attract talent)
3. **Tone** — how they want to come across (e.g., professional, conversational, bold, vulnerable, data-driven)
4. **Format** — post type (short hook post, long-form story, listicle, carousel script, article intro)
5. **Audience** — who they're speaking to (e.g., founders, PMs, engineers, investors, recruiters)

If the user has already provided any of these in their message, skip asking for them.

## Writing principles

Apply these principles to every piece of content:

### Hook first
- The first 1–2 lines must stop the scroll. Use curiosity, a bold claim, a surprising stat, a contrarian take, or a relatable pain point.
- Avoid starting with "I" — it performs worse.
- No "excited to announce" or "thrilled to share" openers.

### Structure for skimmability
- Use short paragraphs (1–3 lines max).
- Use line breaks liberally — dense walls of text kill engagement.
- For lists, lead each item with a strong word.
- End sections with a bridge line that pulls the reader forward.

### Voice and authenticity
- Write in first person. Specific > generic.
- Real details (numbers, names, dates, places) beat vague claims.
- Show the behind-the-scenes: the problem, the decision, the outcome.
- Avoid corporate jargon: "synergies", "leverage", "at the end of the day", "game-changer".

### Call to action
- End with a single, clear CTA. Examples:
  - "What's your take? Drop it below."
  - "Tag someone building in this space."
  - "Save this if it's useful — I'll post more like it."
  - "Follow for weekly breakdowns on [topic]."
- Never ask two questions at once.

### Hashtags
- Add 3–5 relevant hashtags at the end, not inline.
- Choose hashtags with active communities (e.g., #startups, #productmanagement, #venturecapital, #buildinpublic).

## Format templates

### Short hook post (best for engagement)
```
[Hook line — 1 sentence, bold/surprising/relatable]

[Context — 2–3 sentences expanding on the hook]

[Key insight or lesson — 2–4 short lines or a micro-list]

[CTA — 1 sentence]

#hashtag1 #hashtag2 #hashtag3
```

### Story post (best for reach)
```
[Hook — set up the tension or contrast]

Here's what happened:

[The situation — brief]
[The challenge — specific]
[What you tried]
[What worked (or failed)]
[The outcome — with a real number or result if possible]

The lesson: [1 clear takeaway]

[CTA]

#hashtag1 #hashtag2 #hashtag3
```

### Listicle post (best for saves and shares)
```
[Hook — e.g., "X things I wish I knew before doing Y:"]

1. [Item] — [1-sentence explanation]
2. [Item] — [1-sentence explanation]
3. [Item] — [1-sentence explanation]
...

[Closing line that reframes or elevates the list]

[CTA]

#hashtag1 #hashtag2 #hashtag3
```

### Carousel script (best for impressions)
Provide a slide-by-slide script:
- **Slide 1:** Cover / hook (6 words max headline)
- **Slides 2–8:** One insight per slide, headline + 1–2 supporting lines
- **Last slide:** CTA + follow prompt

## Output format

Always deliver:
1. **The post** — ready to copy-paste, with line breaks formatted for LinkedIn
2. **Variants** (if time allows) — offer a shorter and longer version, or A/B hook options
3. **Posting tip** — one tactical note (best time to post, whether to tag anyone, whether to post natively vs. share a link)

## Example invocation

User: `/linkedin-content I want to post about our PRISM valuation tool launch, targeting real estate fund managers, professional tone, short post`

Claude should produce a scroll-stopping hook post ready to publish, optimized for the real estate / proptech LinkedIn audience.
