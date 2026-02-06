---
title: 'Google''s Hiring Process: A Review'
author: Unknown
reviewAuthor: Anonymous
contestId: 2025-non-book-reviews
contestName: 2025 Non Book Reviews
year: 2025
publishedDate: '2026-02-06T16:52:48.894Z'
slug: googles-hiring-process-a-review
wordCount: 2815
readingTimeMinutes: 13
originalUrl: >-
  https://docs.google.com/document/d/1d0vRSj1E93joWWvbUen2XGuDjN_mM94ybMIAADzM2fo
source: gdoc
tags:
  - Technology
---

It’s almost become a meme now that everyone wants to hire like Google, asking ridiculous questions about reversing a spliced linked binary hash tree in O(log(e^n!)) time.

Meanwhile [sober analysts](https://x.com/GergelyOrosz/status/1842652638246285763) will tell you that while what Google does makes sense for them, it might not apply to your particular startup, yadda yadda yadda

So how does Google actually hire? Might it work for you? Does it even work for them?

This review probably isn’t going to answer any of that, but I’ve ranted to everyone in my friends, family, colleagues, etc. about the hiring process so much that they’ve all banned me talking about it, so now I get to rant at you instead.

## Who Am I?

I’m an L5 software engineer at Google. I also do about 1 to 2 coding interviews a week, and have been here 4 years.

## What are these levels anyway?

This is gonna come up a few times so let’s get it cleared up.

L3: New hire, at most a few years out of school. They’re expected to need a fair bit of handholding, and you aren’t even allowed to ask them to bring you coffee anymore, which means that they can waste more time than they save. But the idea is they should eventually graduate and become a…

L4: At this stage it’s expected that I can tell you what to do and you’ll get it done. They won’t take leadership over large projects, but anything in the space of a single person’s work for 2 weeks to a month they should be able to design and implement independently. You can stay an L4 indefinitely if you want to, but most SWEs will aim to make it to an:

L5: Now you’ll be expected to manage larger projects, including being lead developer on significant features or entire projects. You might architect an entire system, not just a minor change. Most developers stay here, but a lot continue to:

L6+: At this stage you need to show you’re something impressive, and the standards get ever higher as you progress further. You might be the point man for designs for an entire team, or own some particularly impressive code or products. There’s rumored to be a lot of politics around this, and some claims that it leads to the whole killed by Google problem because an L7 needs to think of a new product to get promoted so decides that a new social network is just the ticket, then moves onto something else as soon as he’s got the goods. I dunno man, I just work here.

## How does the hiring process at Google work?

This is going to focus on the hiring process for software engineers, cause that’s what I know.

### Interview Types

Every interview at Google is 45 minutes long. The first 5 minutes are just chit-chat, and the last 10 minutes are an opportunity for the candidate to ask the interviewer some questions, so there’s only 30 minutes that actually matter.

There’s 3 types of interviews an average candidate might face:

*   Coding and Algorithms (C&A)
*   Googleyness and Leadership (G&L)
*   System Design

System design is usually for L5+ candidates, and I don’t do them, so I won’t discuss it. We’ll focus more on the other two later.

### The Process

All candidates will speak to a recruiter for 15 minutes just to make sure they exist and are vaguely relevant. They then go through a preliminary interview. This is essentially identical to a C&A interview, except the aim is to check whether it’s worth bringing the candidate back for more interviews, so it’s ok to be a bit less strict - you’re just trying to filter out the no-hopers.

Once that’s done candidates will have a series of interviews. For an L5 candidate that might be 3 C&As, 1 G&L, and one System Design. For an L3, it might be 2 C&As and one G&L. Everyone gets one G&L.

If they pass all of that they’ll need to be allocated to a team. Sometimes candidates will be hired for a specific role, but that’s rare. Usually they’ll be recruited as a generic Googler, then they’ll meet with lots of teams until both agree that it’s a match, and the candidate will get an offer. Anyone who’s passed the initial rounds of interviews is considered to be good enough for Google so these meetings will usually focus on what the team does and what the candidate is interested in, instead of technical questions.

### Evaluating the Candidate

Google uses a structured grading rubric. What that means in practice is:

1.  The interviewer will write up everything that happened in the interview, but the chances are nobody’s ever going to look at that.
2.  They then rate the candidate from 1 to 4 on a variety of skills - e.g. coding, communication, testing, etc. There’s a detailed description of what each rating means for each skill, and they write up a couple of sentences about why the candidate deserved that rating.
3.  Finally they rate the candidate anywhere from Strong No Hire to Strong Hire, and give a brief justification for this rating.

The descriptions for each skill depend on the level the candidate is aiming for, so L3s have lower expectations than L5s. You can also optionally rate the candidate for one level above or below their target level, if you think they outperformed your expectations, or that they aren’t good enough for L4 but would be fine as an L3.

The hiring committee is then responsible for looking at the responses from all interviewers and making a decision.

## The Coding and Algorithms interview

This is the interview with all the famous Google interview questions. There’s a bank of interview questions, and interviewers are expected to pick one they like, or add their own questions to the bank. Questions are regularly removed if they become too popular on LeetCode or similar.

The interviewer will ask the question, and then the candidate will discuss approaches, before implementing it in a shared UI. The UI offers syntax highlighting but nothing else - no compiler or code suggestions.

Questions tend to be very algorithm heavy - lots will require using binary trees or dynamic programming for example, as well as more obscure data structures like min-heaps. Because most programmers have never used a min-heap in their life, Google recommends candidates bone up on their data structures before their interviews.

I think this is really stupid. If you're interviewing someone with 10 years experience, and recommend they need to study before they take your interview, that means you're clearly interviewing for the wrong skills. Focus on things they would actually have used in their 10 years as a developer!

It also means that the result is much more random than it should be, depending on whether the candidate happened to hit on the right approach in the very limited time available. Also because the candidate needs to spend a lot of time thinking, they have less time to actually write code.

Finally the only data structures a software developer needs to know are arrays and hashmaps. [Nested loops go brrr](https://ericlippert.com/2020/03/27/new-grad-vs-senior-dev/). If you have a performance problem it’s most probably your network calls. If you still have a performance problem, it’s probably something stupid. If your algorithm’s slow, you probably just need to sit and think about it for a while because it doesn’t map to a neat standard algorithm. If it does you can look it up (or ask ChatGPT).

My advice is to instead focus on questions with lots of different approaches, many of which are within reach for a capable programmer in half an hour, but with plenty of edge cases to handle and follow up questions to ask. The question should be the sort of question that might crop up in real life every few months or so. This gives you much more ability to see how the candidate tackles realistic situations, and how they write and structure code.

Let’s give some examples:

BAD

Given an array arr[] and an integer k, where arr[i] denotes the number of pages of a book and k denotes total number of students. All the books need to be allocated to k students in contiguous manner, with each student getting at least one book.

The task is to minimize the maximum number of pages allocated to a student. If it is not possible to allocate books to all students, return -1.

This is the first hard question on [https://www.geeksforgeeks.org/google-interview-questions/](https://www.geeksforgeeks.org/google-interview-questions/)

Firstly this takes a while just to understand.

Secondly, while I could make up real life scenarios where this might be a relevant problem, it’s just not the sort of thing that comes up in real life. Finally there’s one or two clever solutions, and if you don’t think of them quickly enough you’re shit outta luck.

Thirdly, this question doesn’t distinguish between someone fresh outta college or someone with 20 years experience. All that matters is your comp-sci chops. So how can you use it to distinguish between an L3 and L5?

GOOD

Given a number of filepaths, include as much of the end of each filepath as is necessary to uniquely identify it from all the others. So if you have “home/app/a”, “home/app/b”, and “home/config/a” return “app/a”, “b”, and “config/a”.

This is the sort of thing that comes up in real life. I know it comes up in real life because it happened to me last week. And I know that there’s lots of approaches, it’s full of edge cases, an initial solution can be hacked out in 10 minutes, and handling all the edge cases can take waaaaay longer than you thought. And then your reviewer can tell you it’s not necessary and you wasted your entire morning. And then it turns out it is necessary, and you have to spend an hour trying to find it using unspeakable git commands. Only to eventually pick a different approach.

In short, this is coding in the trenches. How you solve this problem tells me what you can do in real life, not your namby-pamby comp sci degree. Just when you think you’re done I’ll tell you that you also need to support Windows paths, and let's see if you can take that like a manTC!

## The Googleyness and Leadership interview

In this interview you’ll be asked 4 to 6 behavioral questions. Things like:

*   Have you ever worked on a project which failed? Why? How could you have let it fail? Are you just a pathetic miserable excuse for a human? Why do you even think you’re worthy to look at me, a Googler?
*   What would you do if you disagreed with your boss? Yeah right? No you wouldn’t, you would silently nod and take it wouldn’t you? Yes, that’s right, you would.

I have no unresolved trauma from my own interview.

Interviewers and candidates both mutually hate this interview. Recruiters hate me giving this interview, because the candidate tends to give me some sort of answer, I nod and say that sounds reasonable, and then we finish all the questions and sort of stare awkwardly at each other for the remaining 20 minutes. I’ve stopped giving these interviews.

Anyway, I get why these are useful, but I cannot imagine a scenario where I would reject an L3 or L4 as a result of their performance here (except for the weird edge cases like if the guy suggests murdering their boss is the best way to resolve a disagreement), so I think Google should just keep this for L5 plus.

## Does the interviewing process work?

Given how much I’ve bad-mouthed the interview process, here’s the point where I should come in with hard cold data and show that results suck, the interview process can’t distinguish good candidates from bad, the L8s are no better than the L3s, etc.

Unfortunately I can’t for two reasons:

1.  I forgot all about the deadline and rushed this off in half an hour. I don’t have any data.
2.  The results actually seem to be quite good.

Developers at Google are consistently among the strongest I’ve ever worked with. At previous companies I was always the most talented developer in every team. Now I’m often not. And the levels seem roughly appropriate - when I find out which level a colleague is (it’s hidden by default) I’m rarely surprised.

Why?

I think the biggest factor is that the interviews act as an IQ test. No-one passes Google interview questions if they’re not clever, and no-one passes them if they can’t write code reasonably quickly, so between the two Google ends up with smart developers. Smart developers are good. And since levels are partly decided based on experience, and partly based on how well you did in the interview (i.e. how smart you are), and smart people make good use of experience, the levels end up about right too. Plus the system design interview helps filter out poor candidates from L5+.

Secondly Google has a huge pool of talented candidates, and candidates are prepared to put in work preparing for a Google interview. So it doesn’t matter if they miss lots of good hires, or put off people by telling them they need to practice LeetCode for a month before they interview, they’ll still get plenty of good catches. This would work a lot less well at a no-name startup or at Walmart.

## The Good, the Bad, and the Ugly

So, what would I recommend Google keep about their hiring process, and what would I recommend they change?

The Good

*   Structured interviews with clear rubrics
*   A separate hiring committee that sees all feedback and makes a decision
*   Feedback is anonymised and doesn’t include e.g. gender or other identifying characteristics
*   Hiring for generic roles instead of a specific position. Microsoft style team specific hiring is silly.
*   Allowing candidates to use any programming language. Good developers can pick up a language in a month, Google isn’t in a rush.
*   One preliminary interview, with a larger number of followup interviews.
*   The shared UI is good, including the fact it doesn’t have a compiler - this forces interviewer and candidate to focus more on high level, and less on minutiae of syntax.
*   Having an actual coding interview is crucial. So many candidates with incredibly impressive resumes are basically incapable of writing code.
*   Consistent interviewing standards across the company means there’s no barrier to moving between teams.
*   The systems design interview is generally good.
*   Once a candidate has been accepted or rejected, interviewers get to see what other interviewers thought. This is a good way to check you’re calibrated.

The Bad

*   Asking questions which are too algorithm heavy, instead of real life questions.
*   The Googleyness and Leadership interview causes a lot of misery, for very little signal.
*   The feedback process can be very slow, with candidates occasionally waiting months to receive an offer.
*   Software developers frequently give G&L interviews to hardware engineers. This usually goes terribly.

The Ugly

*   Telling candidates they need to practise for weeks before their interview is crazy. Ban any mention of a min-heap, a binary-tree, or dynamic programming from the question bank.
*   Of the last 50 people I’ve interviewed, only 4 received offers.

## What about AI?

This doesn’t really have anything to do with Google, but is a general problem. How do you spot AI cheaters?

Firstly - how do LLMs perform in a Google interview?

Well. Very well. Gemini 2.5-pro or O3 can easily one shot the interview question I usually use (and no, I’m not telling it to you). They also perform well, but not perfectly in the followups. They’d easily get hired as an L5.

But either I’m naive, or nobody has ever tried cheating in an interview with me. Candidates almost never write code in a linear fashion. They do it in stops and spurts, refining things as they go, writing one bit, then going backwards to write another. LLMs just give you the whole solution in one shot. I imagine you’d have to be a very talented actor to see that solution, then implement it as if you were doing so from scratch. So for now at least, it doesn’t seem like AI cheating is a huge problem - yet.

## Wrapping Up

I’ve given you all my beef with the Google interview process, and admitted that at the end of the day, it seems to work. I have a couple of pieces of advice, but I can’t really justify them listening to me.

Overall, I’d give it an A-minus.

But hopefully, if you are a recruiter or interview at Google or any other company, I’ve given you a little bit to think about.
