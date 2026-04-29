// ==========================================
// Default Professional Rubrics per Activity Type
// ==========================================
// Standard 5-point scale rubrics following academic best practices.
// Used as fallback when no ActivityTemplate exists.

const DEFAULT_RUBRICS = {
  PPT: [
    {
      name: 'Content Knowledge & Depth',
      criteria: {
        scale1: 'Inaccurate or irrelevant content; major factual errors; no understanding of the topic demonstrated.',
        scale2: 'Superficial coverage with some errors; limited understanding of key concepts; missing important points.',
        scale3: 'Adequate content with mostly accurate information; covers main points but lacks depth in explanation.',
        scale4: 'Well-researched and accurate content; good depth of analysis; covers all key aspects thoroughly.',
        scale5: 'Exceptional mastery of subject matter; insightful analysis with original perspectives; comprehensive and error-free.',
      },
    },
    {
      name: 'Presentation & Communication Skills',
      criteria: {
        scale1: 'Reads directly from slides; inaudible or unclear speech; no eye contact; appears unprepared.',
        scale2: 'Mostly reads from slides; limited eye contact; monotone delivery; minimal audience engagement.',
        scale3: 'Moderate eye contact; clear speech with some reading from notes; basic audience awareness.',
        scale4: 'Confident delivery with good eye contact; clear articulation; engages audience effectively.',
        scale5: 'Outstanding delivery with natural confidence; excellent voice modulation; captivating audience engagement throughout.',
      },
    },
    {
      name: 'Slide Design & Visual Aids',
      criteria: {
        scale1: 'Cluttered slides with excessive text; no visuals; poor formatting; difficult to read.',
        scale2: 'Text-heavy slides; minimal visuals; inconsistent formatting; basic design.',
        scale3: 'Reasonable layout; some relevant visuals; acceptable formatting but could be improved.',
        scale4: 'Clean, well-designed slides; effective use of diagrams and visuals; consistent professional theme.',
        scale5: 'Exemplary slide design; impactful visuals and infographics; perfect balance of text and graphics; highly professional.',
      },
    },
    {
      name: 'Q&A Handling & Subject Clarity',
      criteria: {
        scale1: 'Unable to answer questions; shows no understanding beyond the slides; avoids questions.',
        scale2: 'Struggles with most questions; provides vague or incorrect responses; limited understanding.',
        scale3: 'Answers basic questions adequately; some hesitation with complex queries; reasonable clarity.',
        scale4: 'Handles questions confidently; provides clear, accurate responses; demonstrates solid understanding.',
        scale5: 'Expertly handles all questions; provides detailed explanations with examples; demonstrates deep conceptual clarity.',
      },
    },
  ],

  'Flip Classroom': [
    {
      name: 'Pre-class Preparation & Self-Study',
      criteria: {
        scale1: 'No evidence of pre-class preparation; unfamiliar with assigned material; unable to participate.',
        scale2: 'Minimal preparation; vague understanding of pre-class material; limited readiness.',
        scale3: 'Adequate preparation; understands main concepts from pre-class material; ready for basic discussion.',
        scale4: 'Well-prepared; thorough understanding of pre-class content; actively ready to contribute.',
        scale5: 'Exceptionally prepared; deep understanding with additional research; brings supplementary insights.',
      },
    },
    {
      name: 'In-class Participation & Engagement',
      criteria: {
        scale1: 'No participation; disengaged from discussions; does not contribute to group activities.',
        scale2: 'Rarely participates; passive in group work; minimal contributions when prompted.',
        scale3: 'Participates when called upon; moderate engagement in group activities; follows discussions.',
        scale4: 'Actively participates; contributes meaningful ideas; engages constructively in group work.',
        scale5: 'Leads discussions; initiates thoughtful questions; drives group learning; consistently engaged.',
      },
    },
    {
      name: 'Application & Problem Solving',
      criteria: {
        scale1: 'Cannot apply concepts to problems; no analytical thinking demonstrated; requires constant guidance.',
        scale2: 'Struggles to apply concepts; limited problem-solving ability; needs significant assistance.',
        scale3: 'Applies concepts to standard problems; basic analytical approach; some independent work.',
        scale4: 'Effectively applies concepts to varied problems; good analytical skills; works independently.',
        scale5: 'Creatively applies concepts to complex problems; innovative solutions; helps peers understand applications.',
      },
    },
    {
      name: 'Teaching Effectiveness (Peer Teaching)',
      criteria: {
        scale1: 'Unable to explain concepts to peers; no clarity in communication; confuses others.',
        scale2: 'Partial explanation with errors; unclear communication; limited ability to help peers.',
        scale3: 'Explains basic concepts correctly; reasonably clear; can assist peers with simple topics.',
        scale4: 'Explains concepts clearly with examples; effective communication; helps peers understand well.',
        scale5: 'Outstanding peer teaching; uses analogies and examples brilliantly; makes complex topics accessible.',
      },
    },
  ],

  GD: [
    {
      name: 'Content & Logical Reasoning',
      criteria: {
        scale1: 'Irrelevant points; no logical structure; arguments lack any factual basis.',
        scale2: 'Few relevant points; weak logical flow; limited factual support for arguments.',
        scale3: 'Relevant points with basic reasoning; adequate logical flow; some factual support.',
        scale4: 'Strong, well-reasoned arguments; logical progression of ideas; good factual backing.',
        scale5: 'Exceptional arguments with strong logic; data-driven points; persuasive reasoning throughout.',
      },
    },
    {
      name: 'Communication & Articulation',
      criteria: {
        scale1: 'Incoherent speech; very poor vocabulary; unable to express ideas clearly.',
        scale2: 'Unclear expression; limited vocabulary; frequent grammatical errors; hard to follow.',
        scale3: 'Clear basic communication; adequate vocabulary; understandable with minor errors.',
        scale4: 'Fluent and articulate; good vocabulary; well-structured sentences; easy to follow.',
        scale5: 'Exceptionally articulate; rich vocabulary; compelling delivery; highly persuasive communication.',
      },
    },
    {
      name: 'Leadership & Initiative',
      criteria: {
        scale1: 'No initiative; does not contribute to discussion direction; completely passive.',
        scale2: 'Rarely takes initiative; follows others; minimal role in steering discussion.',
        scale3: 'Occasionally initiates points; moderate influence on discussion; some leadership shown.',
        scale4: 'Frequently initiates discussion; guides group constructively; good leadership presence.',
        scale5: 'Natural leader; expertly steers discussion; encourages all members; balances group dynamics.',
      },
    },
    {
      name: 'Listening & Response Skills',
      criteria: {
        scale1: 'Does not listen to others; interrupts constantly; no acknowledgment of peer viewpoints.',
        scale2: 'Poor listening; occasionally interrupts; rarely builds on others\' points.',
        scale3: 'Listens adequately; sometimes builds on others\' ideas; generally respectful.',
        scale4: 'Active listener; effectively builds on peer ideas; respectful and constructive responses.',
        scale5: 'Exemplary listener; expertly synthesizes diverse viewpoints; fosters inclusive and respectful dialogue.',
      },
    },
  ],

  Viva: [
    {
      name: 'Conceptual Understanding',
      criteria: {
        scale1: 'No understanding of fundamental concepts; unable to define basic terms.',
        scale2: 'Vague understanding; can recall some definitions but cannot explain concepts.',
        scale3: 'Understands core concepts; can explain with some clarity; answers direct questions.',
        scale4: 'Strong conceptual grasp; explains with clarity and examples; connects related topics.',
        scale5: 'Deep mastery of concepts; explains nuances and edge cases; demonstrates comprehensive knowledge.',
      },
    },
    {
      name: 'Application & Analysis',
      criteria: {
        scale1: 'Cannot apply knowledge to scenarios; no analytical thinking; answers are purely memorized.',
        scale2: 'Limited application ability; struggles with analytical questions; mostly rote responses.',
        scale3: 'Can apply concepts to standard scenarios; basic analytical responses; some reasoning shown.',
        scale4: 'Applies knowledge effectively to varied scenarios; good analytical reasoning; draws connections.',
        scale5: 'Expertly applies knowledge to complex scenarios; outstanding analytical depth; innovative reasoning.',
      },
    },
    {
      name: 'Confidence & Communication',
      criteria: {
        scale1: 'Extremely nervous; inaudible or incoherent answers; cannot maintain composure.',
        scale2: 'Noticeably nervous; hesitant answers; limited clarity; struggles under questioning.',
        scale3: 'Moderate confidence; clear answers to familiar questions; some hesitation on difficult ones.',
        scale4: 'Confident demeanor; articulate responses; handles pressure well; clear communication.',
        scale5: 'Highly confident and composed; eloquent responses; handles challenging questions with poise.',
      },
    },
    {
      name: 'Depth of Response & Critical Thinking',
      criteria: {
        scale1: 'One-word answers; zero elaboration; no evidence of critical thinking.',
        scale2: 'Brief answers; minimal elaboration; surface-level thinking only.',
        scale3: 'Adequate responses with some elaboration; basic reasoning; answers the question asked.',
        scale4: 'Detailed responses with good reasoning; explores implications; provides relevant examples.',
        scale5: 'Comprehensive, nuanced responses; exceptional critical thinking; proactively explores related dimensions.',
      },
    },
  ],

  Lab: [
    {
      name: 'Implementation & Code Quality',
      criteria: {
        scale1: 'Program does not compile/run; no meaningful code written; major logical errors throughout.',
        scale2: 'Program partially works; significant bugs; poor code structure; minimal functionality.',
        scale3: 'Program works for basic cases; some bugs in edge cases; acceptable code structure.',
        scale4: 'Program works correctly; clean code; good structure; handles most edge cases.',
        scale5: 'Flawless execution; excellent code quality; efficient algorithms; comprehensive error handling; well-documented.',
      },
    },
    {
      name: 'Understanding & Explanation',
      criteria: {
        scale1: 'Cannot explain code or approach; no understanding of the logic used; appears copied.',
        scale2: 'Vague explanation; limited understanding of approach; cannot explain key sections.',
        scale3: 'Explains basic logic; understands main approach; struggles with detailed questions.',
        scale4: 'Clearly explains code and approach; understands design choices; answers questions well.',
        scale5: 'Expert-level explanation; justifies design decisions; discusses alternatives; deep algorithmic understanding.',
      },
    },
    {
      name: 'Testing & Debugging',
      criteria: {
        scale1: 'No testing performed; unable to identify bugs; no test cases considered.',
        scale2: 'Minimal testing; finds bugs only when pointed out; limited test coverage.',
        scale3: 'Tests basic scenarios; can debug with guidance; adequate test coverage.',
        scale4: 'Thorough testing with multiple test cases; effective debugging; good edge case coverage.',
        scale5: 'Comprehensive test suite; proactive debugging; boundary and stress testing; systematic approach.',
      },
    },
    {
      name: 'Documentation & Lab Record',
      criteria: {
        scale1: 'No documentation; missing lab record; no comments in code.',
        scale2: 'Minimal documentation; incomplete lab record; sparse code comments.',
        scale3: 'Basic documentation present; adequate lab record; some code comments.',
        scale4: 'Well-documented with clear explanations; complete lab record; good code comments.',
        scale5: 'Professional documentation; exemplary lab record with diagrams; comprehensive inline and block comments.',
      },
    },
  ],

  Assignment: [
    {
      name: 'Completeness & Correctness',
      criteria: {
        scale1: 'Incomplete submission; majority of questions unanswered or incorrect; does not meet requirements.',
        scale2: 'Partially complete; several errors; some questions unanswered; meets few requirements.',
        scale3: 'Mostly complete; some errors; answers most questions; meets basic requirements.',
        scale4: 'Fully complete; minor errors only; all questions answered correctly; meets all requirements.',
        scale5: 'Complete and flawless; all answers correct with additional insights; exceeds requirements.',
      },
    },
    {
      name: 'Analytical Depth & Understanding',
      criteria: {
        scale1: 'No analytical effort; copied directly from sources; zero original thinking.',
        scale2: 'Superficial analysis; heavy reliance on sources; minimal original thought.',
        scale3: 'Adequate analysis; some original thinking; demonstrates basic understanding.',
        scale4: 'Good analytical depth; original approach; demonstrates strong understanding of concepts.',
        scale5: 'Exceptional analysis; innovative approach with original insights; demonstrates mastery of the subject.',
      },
    },
    {
      name: 'Presentation & Formatting',
      criteria: {
        scale1: 'Illegible or extremely poor formatting; no structure; very difficult to follow.',
        scale2: 'Poor formatting; disorganized; some sections hard to read.',
        scale3: 'Acceptable formatting; basic structure; readable with minor issues.',
        scale4: 'Well-formatted; clear structure with headings; neat and organized presentation.',
        scale5: 'Professionally formatted; excellent structure; diagrams where appropriate; publication-quality presentation.',
      },
    },
    {
      name: 'Timeliness & Adherence to Guidelines',
      criteria: {
        scale1: 'Submitted very late or not at all; does not follow any guidelines.',
        scale2: 'Submitted late; follows few guidelines; missing required sections.',
        scale3: 'Submitted on time; follows most guidelines; minor deviations.',
        scale4: 'Submitted on time; follows all guidelines; complete adherence to instructions.',
        scale5: 'Submitted early; perfect adherence to all guidelines; includes optional enhancements.',
      },
    },
  ],

  Quiz: [
    {
      name: 'Accuracy of Answers',
      criteria: {
        scale1: 'Less than 20% correct answers; no understanding of the material tested.',
        scale2: '20–40% correct answers; limited recall and understanding.',
        scale3: '40–60% correct answers; moderate understanding; knows basic concepts.',
        scale4: '60–80% correct answers; good understanding; handles most question types well.',
        scale5: '80–100% correct answers; excellent understanding; answers complex questions accurately.',
      },
    },
    {
      name: 'Conceptual Clarity',
      criteria: {
        scale1: 'No conceptual understanding; answers are random guesses.',
        scale2: 'Limited understanding; answers show memorization without comprehension.',
        scale3: 'Basic conceptual understanding; can apply to straightforward questions.',
        scale4: 'Good conceptual clarity; can handle application-based and analytical questions.',
        scale5: 'Deep conceptual clarity; answers even tricky and higher-order thinking questions correctly.',
      },
    },
    {
      name: 'Time Management',
      criteria: {
        scale1: 'Could not complete even half the quiz; extremely poor time management.',
        scale2: 'Completed less than 60% of the quiz; rushed through several questions.',
        scale3: 'Completed the quiz; some questions rushed; adequate time management.',
        scale4: 'Completed the quiz with time to review; good time management throughout.',
        scale5: 'Completed the quiz well within time; thorough review done; optimal time management.',
      },
    },
  ],

  Project: [
    {
      name: 'Problem Definition & Planning',
      criteria: {
        scale1: 'No clear problem statement; no planning or methodology; scope undefined.',
        scale2: 'Vague problem definition; minimal planning; poorly defined scope and objectives.',
        scale3: 'Reasonable problem statement; basic planning and methodology; defined scope.',
        scale4: 'Clear problem definition; well-structured plan with timeline; well-defined scope and objectives.',
        scale5: 'Excellent problem formulation; comprehensive project plan with milestones; innovative and well-scoped.',
      },
    },
    {
      name: 'Technical Implementation',
      criteria: {
        scale1: 'Non-functional implementation; no working prototype; major technical gaps.',
        scale2: 'Partially functional; significant technical issues; limited features implemented.',
        scale3: 'Working implementation with core features; some technical limitations; meets basic requirements.',
        scale4: 'Fully functional with all planned features; good technical quality; reliable performance.',
        scale5: 'Exceptional implementation; all features with extras; optimized performance; production-quality code.',
      },
    },
    {
      name: 'Innovation & Originality',
      criteria: {
        scale1: 'No originality; directly copied existing work; no innovation.',
        scale2: 'Minimal originality; heavily based on existing solutions; token modifications only.',
        scale3: 'Some original elements; builds on existing ideas with own interpretation.',
        scale4: 'Good originality; creative approach to problem solving; notable innovations.',
        scale5: 'Highly innovative; unique approach with original contributions; potential for real-world impact.',
      },
    },
    {
      name: 'Documentation & Demonstration',
      criteria: {
        scale1: 'No documentation; unable to demonstrate project; no report submitted.',
        scale2: 'Minimal documentation; poor demonstration; incomplete report.',
        scale3: 'Basic documentation; adequate demonstration of functionality; acceptable report.',
        scale4: 'Comprehensive documentation; clear demonstration; well-written report with all sections.',
        scale5: 'Professional documentation; impressive live demo; exceptional report with diagrams, results, and conclusions.',
      },
    },
    {
      name: 'Team Collaboration & Individual Contribution',
      criteria: {
        scale1: 'No contribution to team; unable to explain any part of the project.',
        scale2: 'Minimal contribution; can explain only a small portion; poor teamwork.',
        scale3: 'Adequate contribution; understands own part; basic collaboration.',
        scale4: 'Good contribution; understands entire project; effective team collaboration.',
        scale5: 'Outstanding contribution; led key modules; excellent teamwork; mentored peers.',
      },
    },
  ],

  Seminar: [
    {
      name: 'Research & Content Quality',
      criteria: {
        scale1: 'No research evident; content from unreliable sources; factually inaccurate.',
        scale2: 'Limited research; few credible sources; several inaccuracies in content.',
        scale3: 'Adequate research; credible sources used; mostly accurate content.',
        scale4: 'Thorough research; multiple credible sources; accurate and well-organized content.',
        scale5: 'Exceptional research; extensive credible sources; highly accurate; includes latest developments.',
      },
    },
    {
      name: 'Presentation & Delivery',
      criteria: {
        scale1: 'Reads from notes/slides; inaudible; no audience engagement; appears completely unprepared.',
        scale2: 'Mostly reads; limited eye contact; monotone delivery; minimal preparation evident.',
        scale3: 'Some eye contact; clear speech; basic delivery; moderate preparation.',
        scale4: 'Confident delivery; good eye contact; engaging; well-paced and well-prepared.',
        scale5: 'Captivating delivery; natural and polished; excellent audience rapport; thoroughly prepared.',
      },
    },
    {
      name: 'Technical Depth & Analysis',
      criteria: {
        scale1: 'No technical depth; surface-level overview only; no analysis.',
        scale2: 'Shallow technical content; limited analysis; misses key technical aspects.',
        scale3: 'Adequate technical depth; basic analysis; covers main technical points.',
        scale4: 'Good technical depth; insightful analysis; covers advanced concepts.',
        scale5: 'Exceptional technical depth; expert-level analysis; comparative study with state-of-the-art.',
      },
    },
    {
      name: 'Q&A & Subject Mastery',
      criteria: {
        scale1: 'Cannot answer any questions; no understanding beyond what was presented.',
        scale2: 'Answers few questions; struggles with follow-ups; limited deeper understanding.',
        scale3: 'Answers basic questions; moderate handling of follow-ups; reasonable understanding.',
        scale4: 'Handles questions well; confident responses; demonstrates strong subject knowledge.',
        scale5: 'Masterfully handles all questions; provides additional insights; demonstrates expert-level mastery.',
      },
    },
  ],

  Other: [
    {
      name: 'Task Completion & Quality',
      criteria: {
        scale1: 'Task not completed; no meaningful output produced; does not meet any expectations.',
        scale2: 'Partially completed; poor quality output; meets very few expectations.',
        scale3: 'Task completed with acceptable quality; meets basic expectations.',
        scale4: 'Task completed with good quality; meets all expectations; well-executed.',
        scale5: 'Task completed with exceptional quality; exceeds expectations; outstanding output.',
      },
    },
    {
      name: 'Understanding & Application',
      criteria: {
        scale1: 'No understanding demonstrated; cannot explain work or approach.',
        scale2: 'Limited understanding; can partially explain the approach; struggles with application.',
        scale3: 'Adequate understanding; explains approach reasonably; applies concepts appropriately.',
        scale4: 'Good understanding; clearly explains work and reasoning; effective application.',
        scale5: 'Deep understanding; expertly explains and justifies approach; innovative application of concepts.',
      },
    },
    {
      name: 'Effort & Originality',
      criteria: {
        scale1: 'No effort visible; appears copied or plagiarized; no original thinking.',
        scale2: 'Minimal effort; heavily derivative; little original contribution.',
        scale3: 'Adequate effort; some originality; reasonable independent work.',
        scale4: 'Good effort; clearly original work; demonstrates initiative and independent thinking.',
        scale5: 'Exceptional effort; highly original and creative; goes significantly beyond requirements.',
      },
    },
  ],
};

module.exports = DEFAULT_RUBRICS;
