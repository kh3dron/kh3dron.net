---
title: "Force multiplying with AI at Laurel"
date: "November 03, 2025"
---

# How Laurel Multiplies Engineering Productivity with AI: A Case Study

_This is the written form of a talk I gave to an eng org considering getting "ai pilled"._

The startup I work at, Laurel, raised our Series C round in April. All of our investors asked us the same question: "$BIG FIRM says they don't need to hire any more engineers because of AI. Are you doing that? Why not?"

We all know there's some showbusiness in that claim - most of the firms who "don't need to hire engineers anymore" are a) still hiring engineers, and b) selling AI products themselves. But there is some truth here - SWE productivity is not pinned to headcount like it used to be.

Lots of our engineers are excited about using AI tools. They've set things up individually, they use them in their side projects, but there is no official or global policy on how the company uses this stuff.

This led to the invention of my role - Laurel's first "productivity engineer". A member of the infrastructure team explicitly tasked with "Setting up AI". A few months in, here's what I've learned and what I've built.

## The Mission

When I was interviewing for this job, in every round of talks I had with someone, the first 10 minutes was spent with the interviewer and I both being equally confused about what this job was actually supposed to be. In practice, I would begin the interviews by explaining to my interviewer what this job description should be, then spend the rest of the time convincing them that I was the person to do it.

How do you define "using AI for softdev"? Is that just buying everyone a Cursor account? Does this need to be a whole person's job? How do you measure the success of this stuff? what comes to mind right away: lines of code generated, feature velocity, DORA metrics. These are extremely high-level metrics, with lots of room for bad incentives, but we think they are at least somewhat correlated with success here. We've started and stopped on a lot of different projects on this front, but here's a few of them that have stuc around and have shown to be really valuable.

## What We Did

### 1. Tool Wrangling

First step: inventory what we already had. It turns out we'd bought a lot of AI tools and weren't getting good use from most of them. We cataloged everything that anyone was using:

- Agent coders: Claude Code (our primary), Cursor (editor & agents), OpenAI Codex and google Gemini
- PR review automation: Cursor's bug bot, GitHub Copilot variants, Sentry's Seer.ai
- Coding agents: Cursor agents and Devin for headless ticket-to-PR workflows
- Agent builders: Dust, Zapier for no-code workflows
- Connectivity: Almost every single vendor has an MCP server, requiring an N^2 number of connections, integrations, and IAM plumbing to put to work.

About the first hour of every day for me is spent on this catalogging - what's new? what are people asking for? what needs permission and connection? Lucky me, I get admin access to most things, at the cost of needing to hook all this up.

### 2. Universal Configurations

We created an `ai-tools` repository with standardized configs for every tool. Three tiers:

- Required: Everyone uses these. This is mostly stuff like telemetry for tracking usage, but it also includes the set of tools which are so obviously simple and helpful that there really is no excuse not to be using them.
- Recommended: Stuff that works and is helpful.
- Experimental: For early adopters who want bleeding-edge features. This is mostly overkill - every vendor's MCP at once - but it's where lots of our people are.

This solves two problems: it saves everyone time configuring tools, and it ensures we're all getting value from what we're paying for. When someone discovers a good configuration, it goes in the repo at the proper tier. We have a Taskfile in the repo, and you can run task required, task recommended, task experimental to set up whatever you want. Whenever something is new in there, I drop a message on our Slack channel and say "Hey, come get the latest stuff".

### 3. Unified Lookups Endpoint

One of the eternal issues at every company - We store things in all sorts of different places. Someone wants to look something up, but they don't know where it's stored. Is it in a document, an email, a Slack thread, a wiki, a README, a vendor's webapp? Especially considering the amount of vendors that offer MCPs, this seems like something we could fix with AI.

We use Dust.tt as our central hub, with programmatic connections to absolutely everything we can give it. This is mostly useful for non-SWEs asking questions about client relationships, our standards, our products, things that are public knowledge. It's also available through Slack, which is where most people ask their questions. We also built a correction flow, so that if you get a wrong answer from the agent and someone else corrects it, that correction gets stored back in the central source of truth, making this is a self-healing store of data.

On top of this, we built a few specific agents which have access to either specific data sources, or unique data sources. We can call those as sub-agents and they can be invoked specifically, which can improve recall on specific data sources. For example, we made an agent for asking questions about Launch Darkly feature flags on a customer-by-customer basis, which saved our people a lot of time from looking things up in the web.

### 4. Custom MCP Servers

Not all of our vendors have MCP integrations, or some aren't great. Some of them we wrote ourselves. We get two benefits from this:

1. We can give the base functionality to our LLM tools, whether that be for software editing or for general chat applications like the above. "You can now use AI to do X!" is a message we see almost every day in slack.

2. We can customize the exact kinds of queries we need to run based on common issues that we want to be able to fix. There isn't always a single perfect API route that does exactly what we want, but we can put that logic into a basic script and then expose that to the LLM.

This has been a huge force multiplier in the usefulness of the RAG system, as well as for all of our coding agents - They can now reach out to our infrastructure and our logging to debug bigger issues than just repo-level coding.

### 5. Headless Coding

This is something that's currently being worked on. It's still pretty early days and not yet suitable for full-time use. The idea is: can we upgrade the minimum viable unit of pending work from being a ticket, which someone has to eventually start working on, to being a pull request, which is at least somewhat further along?

Obviously, if you try and start vibecoding every single new idea, you're going to end up with a lot of shit. You're going to waste engineers' time and make them really unhappy. So, how are we improving the usefulness of this kind of system?

The easy answer is model performance beta. There is only so much incremental performance we can get out of the system by effectively tricking it into being a better programmer. We are doing that, but this is a system we expect to get better every time a new foundation model comes out. So that's nice.

But the real answer is what we call repo hygiene: every one of our repositories needs to have clear documentation, clear taskfiles, instructions for running the program locally, tests, coverage, and all that good stuff you expect. In practice, we all know that this kind of hygiene drifts over time, especially when you're moving at our pace. It doesn't seem like an issue when you have the same people working on the same systems all the time. But in this new world, the average opener of a pull request is not going to be someone who is on a first-name basis with every function.

A few weeks ago, the CTO of a large payments company and I were talking about this issue of forcing hygeine for AI performance. My question was, Is this really worth doing? Is this not going to be needed when models just get better? He explained this sort of work as a Pascal's wager for AI. Whether or not AI can do all of your coding for you, this is the kind of work that you really should be doing anyway to improve the effectiveness of your employees who are merely human. And in the best case, where AI really can code for you, there is no world in which this hurts the performance of these tools.

## What We've Learned

At the strategy level of running an entire engineering org, what are you supposed to do? What do you have to do to adjust, given the speed of all this? It feels completely impossible to make any kind of plans when 6 months from now the world is going to look different. There are two main things that you have to keep in mind:

### The cost of re-evaluating your beliefs

Consider the ROI of re-evaluating a belief.

Here's a bad experiment to run: Am I still deathly allergic to shellfish? If you are still allergic to shellfish, that's a big problem to have run that experiment. And in the best case, which is unlikely to have suddenly changed, now you get to eat shellfish sometimes. That's good, I guess. Was that worth the risk to find out?

Here's a good experiment to run: Is red wine better the second time than I had it the first? You probably didn't like red wine much the first time you tried it. But trying it a second time is very easy. If you still don't like it, it's not that bad. The odds that you eventually start liking wine are pretty good. And the lifetime value of knowing that you enjoy wine is quite high. So that's a belief you should re-test often, as I'm sure most of us did.

So if you're on the fence about AI coding, let me convince you that this is an experiment you _must_ run.

- The testing cost is very low. Use the tool for an hour, then give up.
- The odds you will find value in the tools is very high.
- The payoff is a single digit multiplication of your productivity.

Given this, you should be dedicating lots of time to trying to use AI. You could very easily make the case to spend an hour a day trying new tools.

### Buying versus building

It may seem like because of all this, you should be building everything all the time, that buying software is now for suckers. But the same speed multiplication that we are seeing in terms of our own development is also happening inside of many of our vendors.

I've always considered myself a software engineer, someone who writes code - it's taken some time to adjust to the fact that, in a lot of cases, it is a better use of time for us to buy something quickly and set it up than try to build it ourselves from scratch. Of course, this depends on your particular company's profile of money and time and headcounts, but this is where Laurel is at.

### Documentation is now infrastructure

I spend a lot of time now telling people to write things down, organize scripts, clean their repos, and stop sharing secret snippets and install steps through Slack messages. Clean READMEs, well-structured repos, comprehensive tests and linting; These are good for both your human employees, as well as the headless agents which are now going to be doing an increasing ratio of the work inside these repos.

### Being maximally useful

As an engineer, it hurts to admit this. But for most problems, buying Dust or Cursor or Devin is faster than building it ourselves. For a task which previously would have been a stretch for me to do, like something on the border of my team and another, it's now easier for me to just hand that off to the machine. My individual value as an individually contributing programmer is narrower than it used to be.

The exception here - the place where I still get to write my own code - is the connective tissue. As there are more tools around, they still need to be connected to each other, and those pipes are not always available off the shelf. custom integrations for vendor-specific APIs are still necesarry, and the volume of them needed grows quadratically with your number of tools. There's an easy argument to be made that this is now me supporting the tools instead of the tools supporting me. Such is life!

## What are we doing next?

We have lots of projects and plans in place on further ways to multiply the productivity of our human coders as well as increase the performance and decrease the annoyance from our fully headless workflows. I'm sure I will write another version of this blog post a year from now with a suite of radically different predictions and tools in use.
