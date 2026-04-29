// ==========================================
// Conduction Guidelines Component
// Hardcoded faculty guidelines per activity type
// ==========================================

import { useState } from 'react';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';
import { getYouTubeEmbedUrl } from '../utils/videoEmbed';

const ACTIVITY_GUIDELINES = {
  PPT: {
    icon: '📊',
    title: 'PPT Presentation',
    objective: 'Assess students\u2019 ability to research a topic, organize content logically, and deliver an effective oral presentation with visual aids.',
    sections: [
      {
        heading: 'Pre-Activity Preparation',
        items: [
          'Announce the activity at least one week in advance with clear topic assignments or topic-selection rules.',
          'Share the rubric with students beforehand so they know the evaluation criteria (e.g., content depth, slide design, delivery, Q&A handling).',
          'Define constraints: maximum slides (10\u201315 recommended), time limit per student (8\u201312 min), mandatory Q&A slot (2\u20133 min).',
          'Prepare the classroom with a projector, screen, pointer, and backup laptop.',
          'Create a presentation schedule/order and share it with the class.',
        ],
      },
      {
        heading: 'During the Activity',
        items: [
          'Brief students on decorum: audience must remain attentive, phones on silent, no cross-talk.',
          'Start each presentation by asking the student to introduce the topic and its relevance.',
          'Use a timer visible to the presenter; give a 2-minute warning before time runs out.',
          'After each presentation, open 2\u20133 audience questions before faculty questions.',
          'Score each rubric criterion immediately while observations are fresh.',
          'Note standout strengths or areas of improvement per student for qualitative feedback.',
        ],
      },
      {
        heading: 'Post-Activity & Evaluation',
        items: [
          'Compile scores and share individual feedback within 48 hours.',
          'Highlight top 3 presentations in class for peer motivation.',
          'If a student missed the slot, schedule a make-up within the same week.',
          'Record common issues (e.g., text-heavy slides, lack of citations) and address them in the next lecture.',
        ],
      },
      {
        heading: 'Best Practices',
        items: [
          'Encourage use of diagrams, charts, and live demos over plain text.',
          'Disallow reading directly from slides\u2014promote free speaking.',
          'Rotate Q&A questioners so all students participate.',
          'Consider peer evaluation forms for a small weightage component.',
        ],
      },
    ],
  },
  'Flip Classroom': {
    icon: '🔄',
    title: 'Flip Classroom',
    objective: 'Students study assigned material beforehand and demonstrate understanding through an in-class teaching/discussion session led by them.',
    sections: [
      {
        heading: 'Pre-Activity Preparation',
        items: [
          'Select and distribute study material (videos, papers, textbook chapters) at least 5\u20137 days before the session.',
          'Clearly define what students are expected to learn and be able to explain.',
          'Assign specific sub-topics to individual students or small groups.',
          'Share the rubric covering criteria like conceptual clarity, explanation quality, use of examples, and audience engagement.',
          'Prepare 3\u20135 probing questions per sub-topic to test depth during the session.',
        ],
      },
      {
        heading: 'During the Activity',
        items: [
          'Begin with a quick 5-minute quiz or poll to verify that students studied the material.',
          'Let each student/group present their sub-topic (10\u201315 min) followed by Q&A.',
          'Encourage the presenting student to use the whiteboard, code demos, or diagrams\u2014not just slides.',
          'Intervene to correct misconceptions immediately\u2014do not let wrong explanations propagate.',
          'Facilitate peer discussion: ask audience members to add to or challenge the explanation.',
          'Score based on depth of understanding, not just delivery style.',
        ],
      },
      {
        heading: 'Post-Activity & Evaluation',
        items: [
          'Summarize key takeaways and clarify any remaining doubts.',
          'Provide individual scores and written feedback on conceptual gaps.',
          'Assign a short follow-up problem or reflection note to reinforce learning.',
        ],
      },
      {
        heading: 'Best Practices',
        items: [
          'Vary the material format\u2014mix videos, research papers, and textbook readings.',
          'Pair weaker students with stronger ones for group-based flip sessions.',
          'Track which students consistently come unprepared and intervene early.',
        ],
      },
    ],
  },
  GD: {
    icon: '💬',
    title: 'Group Discussion',
    objective: 'Evaluate communication skills, logical reasoning, teamwork, leadership, and the ability to articulate and defend viewpoints.',
    videoUrl: 'https://youtu.be/69JpdGqM3NM',
    sections: [
      {
        heading: 'Pre-Activity Preparation',
        items: [
          'Form groups of 6\u201310 students. Mix strong and reserved speakers for balanced dynamics.',
          'Prepare 3\u20134 topic options per round (technical, current affairs, or abstract) and reveal only at the start.',
          'Share evaluation rubric covering: content relevance, communication clarity, body language, listening, leadership, and conclusion ability.',
          'Arrange seating in a circle or U-shape so all participants face each other.',
          'Assign one faculty observer per group if multiple groups run in parallel.',
        ],
      },
      {
        heading: 'During the Activity',
        items: [
          'Announce the topic and give 2\u20133 minutes for students to collect their thoughts (no phones/notes).',
          'Set a total time of 12\u201315 minutes per discussion round.',
          'Do NOT intervene unless the discussion goes completely off-track or becomes heated.',
          'Track individual participation: note who initiates, who builds on others\u2019 points, who summarizes.',
          'Watch for negative behaviors: interrupting, dominating, personal attacks\u2014mark accordingly.',
          'After time is up, optionally ask each student for a one-line conclusion.',
        ],
      },
      {
        heading: 'Post-Activity & Evaluation',
        items: [
          'Score each student individually on the rubric\u2014avoid giving the whole group one score.',
          'Provide group-level feedback: what went well, what the group missed.',
          'Give private feedback to students who dominated or didn\u2019t participate.',
        ],
      },
      {
        heading: 'Best Practices',
        items: [
          'Conduct a practice/mock GD first so students understand expectations.',
          'Use a fish-bowl format for large classes: inner circle discusses, outer circle observes and scores.',
          'Rotate group compositions across GD rounds so students interact with different peers.',
        ],
      },
    ],
  },
  Viva: {
    icon: '🎤',
    title: 'Viva Voce',
    objective: 'Assess individual conceptual understanding, depth of knowledge, and the ability to think and respond under pressure.',
    sections: [
      {
        heading: 'Pre-Activity Preparation',
        items: [
          'Define the syllabus scope for the viva and communicate it to students at least one week prior.',
          'Prepare a question bank with easy, medium, and hard questions (at least 30\u201340 per batch).',
          'Share the rubric: conceptual clarity, depth of explanation, application ability, confidence, and response to follow-up questions.',
          'Schedule time slots (5\u201310 min per student) and post the schedule in advance.',
          'Arrange a quiet, distraction-free room. If two faculty members are available, use a panel format.',
        ],
      },
      {
        heading: 'During the Activity',
        items: [
          'Start with an easy warm-up question to settle the student\u2019s nerves.',
          'Progress from basic recall to application and then analysis-level questions.',
          'Ask follow-up \u201cwhy\u201d and \u201chow\u201d questions to test depth\u2014don\u2019t accept surface-level answers.',
          'If a student is stuck, give one hint and note whether they recover.',
          'Keep the tone professional and encouraging\u2014viva should assess, not intimidate.',
          'Score immediately after each student while the interaction is fresh.',
        ],
      },
      {
        heading: 'Post-Activity & Evaluation',
        items: [
          'Record per-student scores and brief qualitative notes.',
          'Identify common weak topics and address them in subsequent lectures or tutorials.',
          'For students who performed poorly, offer optional re-viva or extra study material.',
        ],
      },
      {
        heading: 'Best Practices',
        items: [
          'Avoid yes/no questions\u2014use open-ended questions that require explanation.',
          'Standardize difficulty: every student should get at least one easy and one hard question.',
          'If using a panel, decide beforehand who leads questioning to avoid overlap.',
        ],
      },
    ],
  },
  Lab: {
    icon: '🔬',
    title: 'Lab / Practical',
    objective: 'Evaluate hands-on skills, problem-solving ability, code/experiment quality, and understanding of underlying concepts.',
    sections: [
      {
        heading: 'Pre-Activity Preparation',
        items: [
          'Design the lab problem statement clearly\u2014include expected inputs, outputs, and constraints.',
          'Test the problem/experiment yourself to estimate realistic completion time.',
          'Ensure all systems, tools, compilers, and lab equipment are functional before the session.',
          'Share the rubric: correctness, code quality/experiment procedure, efficiency, viva/explanation, documentation.',
          'Optionally provide a starter template to avoid students wasting time on boilerplate.',
        ],
      },
      {
        heading: 'During the Activity',
        items: [
          'State the problem at the start and clarify doubts in the first 5 minutes\u2014no clarifications after that.',
          'Allow students to use documentation/man pages but NOT full solutions from the internet.',
          'Walk around and observe: check for copy-pasting, note who is genuinely coding/experimenting.',
          'Conduct a brief 2\u20133 minute viva per student while they work\u2014ask them to explain their approach.',
          'Note partial progress: a student who designed well but didn\u2019t finish deserves partial credit.',
        ],
      },
      {
        heading: 'Post-Activity & Evaluation',
        items: [
          'Collect submissions (code, reports, screenshots) before students leave the lab.',
          'Run automated test cases if applicable to verify correctness at scale.',
          'Score based on the rubric; weigh the viva component to catch students who copied.',
          'Return graded work with inline comments highlighting what could be improved.',
        ],
      },
      {
        heading: 'Best Practices',
        items: [
          'Design problems at varying difficulty: a base task all must complete + a bonus challenge.',
          'Rotate problems across batches to prevent answer sharing.',
          'Encourage students to write comments/documentation as they code\u2014not as an afterthought.',
        ],
      },
    ],
  },
  Assignment: {
    icon: '📝',
    title: 'Assignment',
    objective: 'Evaluate students\u2019 ability to independently research, solve problems, and present written work with clarity and rigor.',
    sections: [
      {
        heading: 'Pre-Activity Preparation',
        items: [
          'Design assignments that require analysis and application\u2014avoid questions with directly Google-able answers.',
          'Clearly state submission format (PDF, handwritten, code repo), page/word limits, and deadline.',
          'Share the rubric: correctness, originality, presentation/formatting, depth of analysis, references.',
          'Set a submission deadline with a clear late penalty policy (e.g., \u221210% per day).',
          'Provide reference material or recommended readings to guide students.',
        ],
      },
      {
        heading: 'During the Activity',
        items: [
          'Allow 1\u20132 weeks for completion depending on complexity.',
          'Keep a Q&A window (e.g., first 3 days) for doubt clarification\u2014after that, students work independently.',
          'Remind students about academic integrity and plagiarism policies.',
          'For coding assignments, require students to include a README explaining their approach.',
        ],
      },
      {
        heading: 'Post-Activity & Evaluation',
        items: [
          'Use plagiarism detection tools for written assignments and code similarity checkers for programs.',
          'Grade using the rubric consistently\u2014if multiple evaluators, calibrate with 2\u20133 sample papers first.',
          'Return graded assignments with specific comments\u2014not just a score.',
          'Discuss common mistakes and model answers in the next class session.',
        ],
      },
      {
        heading: 'Best Practices',
        items: [
          'Vary assignment types: problem sets, case studies, mini-projects, literature reviews.',
          'Include a reflection component: ask students what they learned and what was challenging.',
          'For group assignments, require individual contribution statements.',
        ],
      },
    ],
  },
  Quiz: {
    icon: '❓',
    title: 'Quiz',
    objective: 'Quickly assess recall, conceptual understanding, and readiness across a defined syllabus portion.',
    sections: [
      {
        heading: 'Pre-Activity Preparation',
        items: [
          'Define the exact syllabus scope and communicate it at least 3\u20135 days before the quiz.',
          'Prepare the question paper: mix MCQs (for breadth), short-answer (for understanding), and 1\u20132 application questions.',
          'Ensure questions are unambiguous\u2014have a colleague review the paper if possible.',
          'Prepare a model answer key with marks distribution before the quiz.',
          'Decide duration (typically 15\u201330 min) and communicate it clearly.',
          'Arrange seating to minimize copying; prepare 2 sets if needed.',
        ],
      },
      {
        heading: 'During the Activity',
        items: [
          'Distribute papers face-down and start the timer for everyone simultaneously.',
          'No questions after the first 2 minutes\u2014all clarifications should be handled upfront.',
          'Actively invigilate: walk the rows, ensure no phones or cheat sheets.',
          'Give a 5-minute warning before time ends.',
          'Collect all papers strictly at the deadline\u2014no extra time.',
        ],
      },
      {
        heading: 'Post-Activity & Evaluation',
        items: [
          'Grade using the answer key consistently\u2014award partial marks for partially correct short answers.',
          'Return graded quizzes within one week.',
          'Discuss the answers in class: go through each question, explain the correct approach.',
          'Track score distributions to identify topics that need re-teaching.',
        ],
      },
      {
        heading: 'Best Practices',
        items: [
          'Conduct surprise quizzes occasionally to encourage continuous study habits.',
          'Use online quiz tools (Google Forms, Moodle) for instant grading of MCQ-only quizzes.',
          'Keep difficulty progressive: early quizzes easier, later quizzes more challenging.',
          'Ensure quizzes collectively cover the entire syllabus by end of semester.',
        ],
      },
    ],
  },
};

export { ACTIVITY_GUIDELINES };

function asList(items) {
  if (!Array.isArray(items)) return [];
  return items.filter(Boolean).map((item) => `${item}`.trim()).filter(Boolean);
}

function buildStructuredSections(guide) {
  const sections = [];

  const preparationChecklist = asList(guide?.preparationChecklist);
  if (preparationChecklist.length) {
    sections.push({
      heading: 'Pre-Activity Preparation',
      items: preparationChecklist,
    });
  }

  const timingBreakdown = Array.isArray(guide?.timingBreakdown)
    ? guide.timingBreakdown
      .filter((item) => item?.phase && Number(item?.durationMinutes) > 0)
      .map((item) => `${item.phase}: ${item.durationMinutes} min`)
    : [];
  if (timingBreakdown.length) {
    sections.push({
      heading: 'Recommended Time Split',
      items: timingBreakdown,
    });
  }

  const conductSteps = Array.isArray(guide?.conductSteps)
    ? guide.conductSteps
      .filter((item) => item?.title)
      .map((item) => {
        const details = asList(item.details);
        const duration = Number(item.durationMinutes) > 0 ? ` (${item.durationMinutes} min)` : '';
        return details.length
          ? `${item.title}${duration}: ${details.join(' | ')}`
          : `${item.title}${duration}`;
      })
    : [];
  if (conductSteps.length) {
    sections.push({
      heading: 'Step-by-Step Conduct Flow',
      items: conductSteps,
    });
  }

  const rubricMappingTips = asList(guide?.rubricMappingTips);
  if (rubricMappingTips.length) {
    sections.push({
      heading: 'Rubric Mapping Tips',
      items: rubricMappingTips,
    });
  }

  const commonMistakes = asList(guide?.commonMistakes);
  if (commonMistakes.length) {
    sections.push({
      heading: 'Common Mistakes To Avoid',
      items: commonMistakes,
    });
  }

  const bestPractices = asList(guide?.bestPractices);
  if (bestPractices.length) {
    sections.push({
      heading: 'Best Practices',
      items: bestPractices,
    });
  }

  return sections;
}

function hasStructuredGuide(guide) {
  if (!guide) return false;
  return Boolean(
    guide.objective ||
    guide.videoUrl ||
    asList(guide.outcomes).length ||
    asList(guide.preparationChecklist).length ||
    asList(guide.rubricMappingTips).length ||
    asList(guide.commonMistakes).length ||
    asList(guide.bestPractices).length ||
    (Array.isArray(guide.timingBreakdown) && guide.timingBreakdown.length) ||
    (Array.isArray(guide.conductSteps) && guide.conductSteps.length)
  );
}

/** Renders conduction guidelines for a given activity type */
export default function ConductionGuidelines({ activityType, collapsible = false, guideData = null, showVideo = true }) {
  const [expanded, setExpanded] = useState(!collapsible);

  const fallback = ACTIVITY_GUIDELINES[activityType];
  const structuredGuide = guideData?.guide || guideData;
  const useStructured = hasStructuredGuide(structuredGuide);

  const data = useStructured
    ? {
      icon: fallback?.icon || '📘',
      title: fallback?.title || `${activityType} Activity`,
      objective: structuredGuide.objective || fallback?.objective || '',
      videoUrl: structuredGuide.videoUrl || fallback?.videoUrl || '',
      outcomes: asList(structuredGuide.outcomes),
      sections: buildStructuredSections(structuredGuide),
      totalDurationMinutes: Number(structuredGuide.totalDurationMinutes) || 0,
    }
    : fallback;

  if (!data) return null;
  const videoEmbedUrl = getYouTubeEmbedUrl(data.videoUrl);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => collapsible && setExpanded(!expanded)}
        className={`w-full bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 ${collapsible ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{data.icon}</span>
            <div className="text-left">
              <h3 className="text-white font-bold text-lg">{data.title} — Conduction Guidelines</h3>
              <p className="text-primary-100 text-sm mt-0.5">
                {useStructured
                  ? 'Admin-curated guide for conducting this activity effectively'
                  : 'For faculty: how to plan, conduct, and evaluate this activity'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {data.totalDurationMinutes > 0 && (
              <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full font-medium">
                ~ {data.totalDurationMinutes} min
              </span>
            )}
            {collapsible && (
              <span className="text-white">
                {expanded ? <HiChevronUp className="w-5 h-5" /> : <HiChevronDown className="w-5 h-5" />}
              </span>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <>
          {/* Objective */}
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
            <p className="text-sm font-semibold text-blue-900 mb-1">🎯 Objective</p>
            <p className="text-sm text-blue-800 leading-relaxed">{data.objective}</p>
            {Array.isArray(data.outcomes) && data.outcomes.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-blue-900 mb-1.5 uppercase tracking-wide">Outcomes</p>
                <ul className="space-y-1">
                  {data.outcomes.map((outcome, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-blue-800">
                      <span className="mt-1 text-blue-500">•</span>
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {showVideo && videoEmbedUrl && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-blue-900 mb-2 uppercase tracking-wide">Reference Video</p>
                <div className="aspect-video w-full overflow-hidden rounded-lg border border-blue-200 bg-black">
                  <iframe
                    src={videoEmbedUrl}
                    title={`${data.title} reference video`}
                    className="h-full w-full"
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sections */}
          <div className="px-6 py-4 space-y-5">
            {data.sections.map((section, idx) => (
              <div key={idx}>
                <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  {section.heading}
                </h4>
                <ul className="space-y-1.5 ml-8">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-primary-400 mt-1 shrink-0">•</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
