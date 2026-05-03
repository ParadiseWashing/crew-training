// @ts-nocheck
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // ── Users ──────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin123", 12);
  const crewHash = await bcrypt.hash("crew123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@crewtraining.com" },
    update: {},
    create: {
      name: "Alex Johnson",
      email: "admin@crewtraining.com",
      passwordHash: adminHash,
      systemRole: "ADMIN",
    },
  });

  // ── Job Roles ──────────────────────────────────────────────────────────────
  const windowRole = await prisma.jobRole.upsert({
    where: { id: "role-window" },
    update: {},
    create: {
      id: "role-window",
      title: "Window Cleaning Technician",
      description: "Residential and commercial window cleaning specialist",
      color: "#3B82F6",
    },
  });

  const pressureRole = await prisma.jobRole.upsert({
    where: { id: "role-pressure" },
    update: {},
    create: {
      id: "role-pressure",
      title: "Pressure Washing Crew",
      description: "Exterior surfaces, driveways, and building wash-downs",
      color: "#10B981",
    },
  });

  const constructionRole = await prisma.jobRole.upsert({
    where: { id: "role-construction" },
    update: {},
    create: {
      id: "role-construction",
      title: "Post-Construction Specialist",
      description: "Final clean on new builds and renovation sites",
      color: "#F59E0B",
    },
  });

  const onboardingRole = await prisma.jobRole.upsert({
    where: { id: "role-onboarding" },
    update: {},
    create: {
      id: "role-onboarding",
      title: "New Hire / Onboarding",
      description: "All new crew members start here",
      color: "#8B5CF6",
    },
  });

  // ── Subjects ───────────────────────────────────────────────────────────────
  const companySubject = await prisma.subject.upsert({
    where: { id: "subj-company" },
    update: {},
    create: {
      id: "subj-company",
      title: "Company Overview & Culture",
      description: "Learn about our mission, values, and what it means to be part of the team.",
      category: "COMPANY",
      isPublished: true,
      requiresSignOff: true,
      orderIndex: 0,
    },
  });

  const safetySubject = await prisma.subject.upsert({
    where: { id: "subj-safety" },
    update: {},
    create: {
      id: "subj-safety",
      title: "Chemical Safety & Handling",
      description: "Critical safety protocols for all cleaning chemicals used in the field.",
      category: "POLICIES",
      isPublished: true,
      requiresSignOff: true,
      orderIndex: 1,
    },
  });

  const windowSubject = await prisma.subject.upsert({
    where: { id: "subj-window" },
    update: {},
    create: {
      id: "subj-window",
      title: "Window Cleaning Mastery",
      description: "Complete guide to traditional squeegee technique, water-fed poles, and screen cleaning.",
      category: "PROCESSES",
      isPublished: true,
      orderIndex: 2,
    },
  });

  const pressureSubject = await prisma.subject.upsert({
    where: { id: "subj-pressure" },
    update: {},
    create: {
      id: "subj-pressure",
      title: "Pressure Washing Operations",
      description: "Equipment setup, surface identification, and safe wash techniques.",
      category: "PROCESSES",
      isPublished: true,
      orderIndex: 3,
    },
  });

  const constructionSubject = await prisma.subject.upsert({
    where: { id: "subj-construction" },
    update: {},
    create: {
      id: "subj-construction",
      title: "Post-Construction Cleaning",
      description: "Detailed protocols for cleaning new builds from rough-in to final inspection ready.",
      category: "PROCESSES",
      isPublished: true,
      orderIndex: 4,
    },
  });

  // ── Topics & Steps for Window Cleaning ────────────────────────────────────
  const topic1 = await prisma.topic.upsert({
    where: { id: "topic-wc-1" },
    update: {},
    create: {
      id: "topic-wc-1",
      subjectId: windowSubject.id,
      title: "Traditional Squeegee Technique",
      description: "Master the foundational squeegee pull that separates amateurs from pros.",
      orderIndex: 0,
    },
  });

  await prisma.step.upsert({
    where: { id: "step-wc-1-1" },
    update: {},
    create: {
      id: "step-wc-1-1",
      topicId: topic1.id,
      title: "Equipment Overview",
      orderIndex: 0,
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Your Squeegee Kit" }] },
          { type: "paragraph", content: [{ type: "text", text: "Before every job, inspect your squeegee kit. A professional window cleaner's toolkit includes:" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Ettore squeegee" }, { type: "text", text: " — 12\", 18\", and 24\" channels" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Mop/T-bar" }, { type: "text", text: " — microfiber sleeve for applying solution" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Bucket" }, { type: "text", text: " — 6-gallon with strip washer holder" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Squeegee solution" }, { type: "text", text: " — dish soap or professional concentrate (1 tsp per gallon)" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Lint-free cloths" }, { type: "text", text: " — for detailing edges" }] }] },
          ]},
          { type: "paragraph", content: [{ type: "text", text: "Replace squeegee rubber every 2-3 jobs or when you see streaking you can't fix with overlap technique." }] },
        ],
      },
    },
  });

  await prisma.step.upsert({
    where: { id: "step-wc-1-2" },
    update: {},
    create: {
      id: "step-wc-1-2",
      topicId: topic1.id,
      title: "The Straight Pull Technique",
      orderIndex: 1,
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Straight Pull — Step by Step" }] },
          { type: "paragraph", content: [{ type: "text", text: "The straight pull is used on most residential windows. Follow these steps every time:" }] },
          { type: "orderedList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Wet the entire pane with the mop — overlap edges by 1 inch" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Wipe a dry strip across the top of the glass with a cloth (creates a dry ledge for the squeegee)" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Place squeegee at top-left corner, tilted at 30°" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Pull across in one smooth stroke — consistent pressure throughout" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Wipe the blade after each pull" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Overlap each subsequent pull by 2\" over the dry area above" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Detail edges and sill with lint-free cloth" }] }] },
          ]},
          { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "Pro tip: Speed is the enemy of quality. Slow, consistent pulls beat fast, sloppy ones every time." }] }] },
        ],
      },
    },
  });

  await prisma.step.upsert({
    where: { id: "step-wc-1-3" },
    update: {},
    create: {
      id: "step-wc-1-3",
      topicId: topic1.id,
      title: "Common Mistakes & Fixes",
      orderIndex: 2,
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Troubleshooting Streaks & Smears" }] },
          { type: "paragraph", content: [{ type: "text", text: "Every technician deals with these issues. Here's how to diagnose and fix them:" }] },
          { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Horizontal streaks across the pane" }] },
          { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Cause:" }, { type: "text", text: " Worn or nicked rubber edge." }] },
          { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Fix:" }, { type: "text", text: " Replace rubber immediately. Carry spare rubbers on every job." }] },
          { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Smearing at bottom edge" }] },
          { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Cause:" }, { type: "text", text: " Not wiping the blade between pulls." }] },
          { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Fix:" }, { type: "text", text: " Wipe blade on your waist cloth after every single pull — make it a habit." }] },
        ],
      },
    },
  });

  // Add quiz for topic 1
  const quiz1 = await prisma.quiz.upsert({
    where: { id: "quiz-wc-1" },
    update: {},
    create: {
      id: "quiz-wc-1",
      topicId: topic1.id,
      passingScore: 80,
      maxAttempts: 3,
    },
  });

  await prisma.question.upsert({
    where: { id: "q1-1" },
    update: {},
    create: {
      id: "q1-1",
      quizId: quiz1.id,
      text: "What angle should the squeegee be tilted at when starting a straight pull?",
      type: "MULTIPLE_CHOICE",
      options: ["15°", "30°", "45°", "60°"],
      correctAnswer: "30°",
      orderIndex: 0,
    },
  });

  await prisma.question.upsert({
    where: { id: "q1-2" },
    update: {},
    create: {
      id: "q1-2",
      quizId: quiz1.id,
      text: "You should wipe the squeegee blade after every pull.",
      type: "TRUE_FALSE",
      correctAnswer: "True",
      orderIndex: 1,
    },
  });

  await prisma.question.upsert({
    where: { id: "q1-3" },
    update: {},
    create: {
      id: "q1-3",
      quizId: quiz1.id,
      text: "Which of the following are part of a standard squeegee kit? (Select all that apply)",
      type: "MULTIPLE_SELECT",
      options: ["Ettore squeegee", "Power drill", "Mop/T-bar", "Lint-free cloths", "Ladder", "Bucket"],
      correctAnswer: ["Ettore squeegee", "Mop/T-bar", "Lint-free cloths", "Bucket"],
      orderIndex: 2,
    },
  });

  await prisma.question.upsert({
    where: { id: "q1-4" },
    update: {},
    create: {
      id: "q1-4",
      quizId: quiz1.id,
      text: "In your own words, describe what causes horizontal streaks and how you would fix it.",
      type: "WRITTEN_RESPONSE",
      orderIndex: 3,
    },
  });

  const topic2 = await prisma.topic.upsert({
    where: { id: "topic-wc-2" },
    update: {},
    create: {
      id: "topic-wc-2",
      subjectId: windowSubject.id,
      title: "Water-Fed Pole Operation",
      description: "Using pure water technology for high-reach and solar panel cleaning.",
      orderIndex: 1,
    },
  });

  await prisma.step.upsert({
    where: { id: "step-wc-2-1" },
    update: {},
    create: {
      id: "step-wc-2-1",
      topicId: topic2.id,
      title: "How Pure Water Systems Work",
      orderIndex: 0,
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "The Science Behind Pure Water Cleaning" }] },
          { type: "paragraph", content: [{ type: "text", text: "Pure water cleaning uses water that has been filtered to remove all dissolved minerals (TDS = 0). When this water dries on glass, it leaves zero residue — meaning spot-free windows with no detailing required." }] },
          { type: "paragraph", content: [{ type: "text", text: "Our system runs tap water through:" }] },
          { type: "orderedList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Sediment filter — removes particles" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Carbon block filter — removes chlorine" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "RO membrane — removes 95% of dissolved solids" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "DI resin tank — polishes to 0 TDS" }] }] },
          ]},
          { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Always check TDS before starting." }, { type: "text", text: " If TDS reads above 10 ppm, the resin needs replacing. Do not use contaminated water." }] },
        ],
      },
    },
  });

  // ── Topics for Safety Subject ──────────────────────────────────────────────
  const safetyTopic1 = await prisma.topic.upsert({
    where: { id: "topic-safety-1" },
    update: {},
    create: {
      id: "topic-safety-1",
      subjectId: safetySubject.id,
      title: "Chemical Identification & Labels",
      description: "Understanding SDS sheets and chemical hazard labels.",
      orderIndex: 0,
    },
  });

  await prisma.step.upsert({
    where: { id: "step-safety-1-1" },
    update: {},
    create: {
      id: "step-safety-1-1",
      topicId: safetyTopic1.id,
      title: "Reading Safety Data Sheets (SDS)",
      orderIndex: 0,
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Every Chemical Has an SDS" }] },
          { type: "paragraph", content: [{ type: "text", text: "A Safety Data Sheet (SDS) is a document that provides information on a chemical product's properties, health hazards, and handling instructions. You are legally required to have access to SDS sheets for every chemical on your job site." }] },
          { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "The 16 Sections" }] },
          { type: "paragraph", content: [{ type: "text", text: "Every SDS has 16 standardized sections. The most critical for field work are:" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Section 2:" }, { type: "text", text: " Hazard identification" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Section 4:" }, { type: "text", text: " First aid measures" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Section 7:" }, { type: "text", text: " Handling and storage" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Section 8:" }, { type: "text", text: " Exposure controls / PPE required" }] }] },
          ]},
          { type: "paragraph", content: [{ type: "text", text: "Our SDS binder is in every company vehicle. Review the SDS for any new chemical before using it." }] },
        ],
      },
    },
  });

  await prisma.step.upsert({
    where: { id: "step-safety-1-2" },
    update: {},
    create: {
      id: "step-safety-1-2",
      topicId: safetyTopic1.id,
      title: "PPE Requirements",
      orderIndex: 1,
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Personal Protective Equipment" }] },
          { type: "paragraph", content: [{ type: "text", text: "PPE is non-negotiable. The following table shows required PPE by chemical type:" }] },
          { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Window Cleaning Solutions (pH 4-9)" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Nitrile gloves (optional but recommended)" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Safety glasses if spraying" }] }] },
          ]},
          { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Concrete Cleaners & Degreasers (pH <4 or >10)" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Required:" }, { type: "text", text: " Chemical-resistant gloves, safety glasses, long sleeves" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Recommended: face shield when mixing concentrates" }] }] },
          ]},
        ],
      },
    },
  });

  // Company topic
  const companyTopic1 = await prisma.topic.upsert({
    where: { id: "topic-company-1" },
    update: {},
    create: {
      id: "topic-company-1",
      subjectId: companySubject.id,
      title: "Our Mission & Values",
      description: "What we stand for and why it matters.",
      orderIndex: 0,
    },
  });

  await prisma.step.upsert({
    where: { id: "step-company-1-1" },
    update: {},
    create: {
      id: "step-company-1-1",
      topicId: companyTopic1.id,
      title: "Welcome to the Team",
      orderIndex: 0,
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Welcome!" }] },
          { type: "paragraph", content: [{ type: "text", text: "We're glad you're here. Our company was built on the belief that professional cleaning is a skilled trade — and we treat it that way. You'll receive world-class training, fair pay, and a team that has your back." }] },
          { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Our Core Values" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Quality over speed" }, { type: "text", text: " — We never rush at the expense of the result." }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Own your mistakes" }, { type: "text", text: " — If you nick a screen, tell the customer and your supervisor immediately." }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Respect the property" }, { type: "text", text: " — Treat every home or site like it's your own." }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Show up ready" }, { type: "text", text: " — Be in uniform, 5 minutes early, equipment checked." }] }] },
          ]},
        ],
      },
    },
  });

  await prisma.step.upsert({
    where: { id: "step-company-1-2" },
    update: {},
    create: {
      id: "step-company-1-2",
      topicId: companyTopic1.id,
      title: "Attendance & Communication Policy",
      orderIndex: 1,
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Showing Up & Communication" }] },
          { type: "paragraph", content: [{ type: "text", text: "Reliability is the foundation of our business. Customers schedule us in advance — a no-call, no-show is never acceptable." }] },
          { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "If you can't make a shift:" }] },
          { type: "orderedList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Text your supervisor at least 2 hours before start time" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Provide a brief reason (no need for details)" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Offer to help find coverage if possible" }] }] },
          ]},
          { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Three unexcused absences = formal review." }] },
        ],
      },
    },
  });

  // ── Assign Job Roles to Subjects ───────────────────────────────────────────
  // Everyone gets Company + Safety
  for (const role of [windowRole, pressureRole, constructionRole, onboardingRole]) {
    await prisma.jobRoleSubject.upsert({
      where: { jobRoleId_subjectId: { jobRoleId: role.id, subjectId: companySubject.id } },
      update: {},
      create: { jobRoleId: role.id, subjectId: companySubject.id },
    });
    await prisma.jobRoleSubject.upsert({
      where: { jobRoleId_subjectId: { jobRoleId: role.id, subjectId: safetySubject.id } },
      update: {},
      create: { jobRoleId: role.id, subjectId: safetySubject.id },
    });
  }
  // Window role gets window subject
  await prisma.jobRoleSubject.upsert({
    where: { jobRoleId_subjectId: { jobRoleId: windowRole.id, subjectId: windowSubject.id } },
    update: {},
    create: { jobRoleId: windowRole.id, subjectId: windowSubject.id },
  });
  // Pressure role gets pressure subject
  await prisma.jobRoleSubject.upsert({
    where: { jobRoleId_subjectId: { jobRoleId: pressureRole.id, subjectId: pressureSubject.id } },
    update: {},
    create: { jobRoleId: pressureRole.id, subjectId: pressureSubject.id },
  });
  // Construction role gets construction subject
  await prisma.jobRoleSubject.upsert({
    where: { jobRoleId_subjectId: { jobRoleId: constructionRole.id, subjectId: constructionSubject.id } },
    update: {},
    create: { jobRoleId: constructionRole.id, subjectId: constructionSubject.id },
  });

  // ── Demo Trainees ──────────────────────────────────────────────────────────
  const trainees = [
    { id: "user-t1", name: "Marcus Webb", email: "marcus@crewtraining.com", jobRoleId: windowRole.id },
    { id: "user-t2", name: "Jordan Torres", email: "jordan@crewtraining.com", jobRoleId: pressureRole.id },
    { id: "user-t3", name: "Sam Okonkwo", email: "sam@crewtraining.com", jobRoleId: onboardingRole.id },
    { id: "user-t4", name: "crew@crewtraining.com", email: "crew@crewtraining.com", jobRoleId: windowRole.id },
  ];

  for (const t of trainees) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        id: t.id,
        name: t.name === "crew@crewtraining.com" ? "Demo Crew" : t.name,
        email: t.email,
        passwordHash: crewHash,
        systemRole: "TRAINEE",
        jobRoleId: t.jobRoleId,
      },
    });

    // Assign subjects based on job role
    const jobRole = await prisma.jobRole.findUnique({
      where: { id: t.jobRoleId },
      include: { subjects: true },
    });

    if (jobRole) {
      for (const js of jobRole.subjects) {
        await prisma.assignment.upsert({
          where: { userId_subjectId: { userId: user.id, subjectId: js.subjectId } },
          update: {},
          create: {
            userId: user.id,
            subjectId: js.subjectId,
            status: "NOT_STARTED",
            progressPercentage: 0,
          },
        });
      }
    }
  }

  // Give Marcus some progress
  const marcus = await prisma.user.findUnique({ where: { email: "marcus@crewtraining.com" } });
  if (marcus) {
    await prisma.stepProgress.upsert({
      where: { userId_stepId: { userId: marcus.id, stepId: "step-wc-1-1" } },
      update: {},
      create: { userId: marcus.id, stepId: "step-wc-1-1" },
    });
    await prisma.stepProgress.upsert({
      where: { userId_stepId: { userId: marcus.id, stepId: "step-wc-1-2" } },
      update: {},
      create: { userId: marcus.id, stepId: "step-wc-1-2" },
    });
    await prisma.assignment.updateMany({
      where: { userId: marcus.id, subjectId: windowSubject.id },
      data: { status: "IN_PROGRESS", progressPercentage: 40 },
    });
  }

  console.log("✅ Seed complete!");
  console.log("   Admin:   admin@crewtraining.com / admin123");
  console.log("   Trainee: crew@crewtraining.com  / crew123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
