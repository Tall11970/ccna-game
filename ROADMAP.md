# NetQuest Platform Roadmap

## Vision
Transform NetQuest from a CCNA-focused platform into a comprehensive Cisco certification exam preparation suite, supporting CCNA, CCNP ENCOR, and CCNP ENARSI with interactive animations, hands-on labs, and progress tracking.

---

## Phase 1: CCNA Foundation ✅ COMPLETE

### Status: COMPLETE
All core CCNA 200-301 v1.1 curriculum implemented with interactive animations.

### Completed Features:
- ✅ Authentication (local & Supabase integration)
- ✅ EULA & Cookie consent management
- ✅ User profiles with progress tracking
- ✅ 13 topic modules with 100+ lessons
- ✅ 4 interactive animations with step-by-step visualization:
  - HSRP (First-hop Redundancy Protocol)
  - DHCP Snooping
  - DAI (Dynamic ARP Inspection)
  - VLAN Hopping attack & mitigation
- ✅ 300+ quiz questions across all domains
- ✅ XP/Level system with achievements
- ✅ Dark theme UI optimized for learning

### CCNA Topics Covered (6 Domains):
1. **Network Fundamentals (20%)** - OSI model, Ethernet, IP addressing, subnetting
2. **Network Access (20%)** - VLANs, STP, EtherChannel, Port Security, DHCP Snooping, DAI
3. **IP Connectivity (25%)** - Routing, RIP, OSPF, EIGRP, BGP, static routes
4. **IP Services (10%)** - NAT/PAT, DHCP, DNS, NTP, SNMP, Syslog, QoS
5. **Security (15%)** - Layer 2 security (Port Security, DHCP Snooping, DAI, VLAN Hopping), ACLs, AAA
6. **Automation (10%)** - REST APIs, Ansible, Python, DNA Center

---

## Phase 2: Multi-Certification Support (PLANNED)

### Objective
Enable users to choose between CCNA, CCNP ENCOR, or CCNP ENARSI on login, with curriculum-specific content and progress tracking.

### Timeline
**Estimated Duration:** 8-12 weeks  
**Priority:** Medium  
**Complexity:** High (new content, architecture changes)

### 2.1 Database & Architecture Refactor

#### Database Changes:
- Add `selected_exam` column to `profiles` table
  - Enum: `CCNA | CCNP_ENCOR | CCNP_ENARSI`
  - Default: NULL (shows selection modal on first login)
  - Allow users to change via profile settings
  
- Extend `user_progress` table:
  - Add `exam_type` column to support separate progress per exam
  - Index on (user_id, exam_type) for efficient queries

#### Code Structure:
```javascript
// Replace single TOPICS array with curriculum-based structure
const CURRICULUM = {
  CCNA: {
    name: 'Cisco Certified Network Associate',
    version: '200-301 v1.1',
    color: '#00d4ff',
    domains: 6,
    topics: 13,
    lessons: 100+,
    questions: 300+,
    topics: [...]  // Existing CCNA TOPICS array
  },
  CCNP_ENCOR: {
    name: 'Cisco Certified Network Professional - Enterprise Core Infrastructure',
    version: '350-401 v1.1',
    color: '#ff9900',
    domains: 4,
    topics: 32,
    lessons: 150+,
    questions: 500+,
    topics: [...]  // New ENCOR content
  },
  CCNP_ENARSI: {
    name: 'Cisco Certified Network Professional - Enterprise Advanced Routing & Services',
    version: '300-410 v1.1',
    color: '#ff6ec7',
    domains: 5,
    topics: 28,
    lessons: 140+,
    questions: 450+,
    topics: [...]  // New ENARSI content
  }
}
```

### 2.2 UI/UX Changes

#### Curriculum Selection Modal (First Login)
- Display after authentication if `selected_exam` is NULL
- Show 3 cards with:
  - Exam name & version
  - Pass score & exam duration
  - Number of topics & questions
  - Description of focus area
- Buttons: Select CCNA / Select ENCOR / Select ENARSI
- Option: "Change later in Settings"

#### Profile Settings Enhancement
- Add "Certification Path" section
- Display current exam: CCNA | CCNP ENCOR | CCNP ENARSI
- Button: "Change Certification"
  - Shows modal with warnings about progress reset
  - Only resets selected exam's progress, keeps others
- Show separate progress bars for each exam taken

#### Dashboard Update
- Add exam badge/label (e.g., "CCNA 200-301")
- Show curriculum-specific stats:
  - Topics completed
  - Quiz average
  - Estimated time to readiness

### 2.3 Content Development: CCNP ENCOR (350-401)

#### Domain 1: Architecture (15%)
- Enterprise network design patterns
- Software-defined networking (SDN)
- Cloud connectivity (AWS, Azure)
- Network redundancy & high availability
- Virtualization technologies (hypervisors, containers)

#### Domain 2: Virtualization (20%)
- Hypervisor technologies (VMware, KVM, Hyper-V)
- Virtual switching & routing
- Container orchestration (Kubernetes basics)
- NFV (Network Function Virtualization)

#### Domain 3: Infrastructure (25%)
- Advanced routing (OSPF areas, BGP communities, route filtering)
- MPLS & segment routing
- QoS architecture (queuing, traffic shaping, policing)
- Multicast protocols (PIM, IGMP)
- Advanced Ethernet (LAG, spanning tree enhancements)

#### Domain 4: Network Assurance (20%)
- Syslog, SNMP, NetFlow analysis
- Telemetry & streaming data
- Network monitoring tools
- Baseline & anomaly detection
- Troubleshooting methodologies

#### Domain 5: Security (20%)
- Advanced ACLs & security policies
- Encryption & VPN technologies
- Zero-trust network architecture
- DLP & threat prevention
- Security appliances (ASA, IDS/IPS)

**Estimated Content:** 150+ lessons, 500+ questions, 8-10 animations

### 2.4 Content Development: CCNP ENARSI (300-410)

#### Domain 1: Layer 3 Pathways (25%)
- Advanced routing protocols (OSPF optimization, BGP advanced)
- Route redistribution & summarization
- Policy-based routing
- VRF (Virtual Routing & Forwarding)
- GRE & IPSec tunnels

#### Domain 2: Enterprise Routing (25%)
- EIGRP advanced concepts
- OSPF in large networks
- BGP for ISP/enterprise networks
- Convergence optimization
- Load balancing & traffic engineering

#### Domain 3: Services (25%)
- DHCP optimization & IPv6 DHCP
- DNS security & performance
- NTP precision & security
- SNMP v3 & secure monitoring
- Syslog aggregation & analysis
- Advanced QoS (MQC, policy maps)

#### Domain 4: VPN (15%)
- Site-to-site VPN (IPSec, GRE, DMVPN)
- Remote access VPN technologies
- VPN encryption & authentication
- VPN troubleshooting

#### Domain 5: Infrastructure Security (10%)
- Device hardening
- Access control (TACACS+, RADIUS)
- Logging & auditing
- Incident response procedures

**Estimated Content:** 140+ lessons, 450+ questions, 7-9 animations

### 2.5 Shared Content Strategy

#### Reusable Lessons from CCNA:
- OSI model fundamentals
- Ethernet & switching basics
- IP addressing & subnetting
- Routing fundamentals (static, RIP, OSPF, EIGRP, BGP basics)
- VLAN concepts
- Spanning Tree basics
- ACL fundamentals
- Basic security concepts

#### Reusable Animations:
- OSI model interactive demo
- Spanning Tree port roles & BPDU exchanges
- OSPF neighbor relationships
- BGP state machine

#### Extended/Advanced Versions:
- OSPF: CCNA basics → ENCOR areas & optimization → ENARSI large-scale design
- BGP: CCNA basics → ENCOR communities/attributes → ENARSI policy engineering
- Security: CCNA layer 2 → ENCOR enterprise → ENARSI advanced threats

### 2.6 Implementation Priorities

**Phase 2A (Weeks 1-4):** Foundation & Architecture
- [ ] Database schema changes & migrations
- [ ] Curriculum selection modal UI
- [ ] Profile settings enhancement
- [ ] Dashboard curriculum display
- [ ] TOPICS array refactoring

**Phase 2B (Weeks 5-8):** CCNP ENCOR Content
- [ ] Write 150+ lessons (distributed team ideal)
- [ ] Create 500+ quiz questions
- [ ] Develop 8-10 animations (advanced routing, QoS, multicast, etc.)
- [ ] Integration testing

**Phase 2C (Weeks 9-12):** CCNP ENARSI Content
- [ ] Write 140+ lessons
- [ ] Create 450+ quiz questions
- [ ] Develop 7-9 animations (VPN, advanced routing, services, etc.)
- [ ] Cross-exam testing & validation

### 2.7 Success Metrics

- [ ] Users can select exam on first login
- [ ] Curriculum-specific content displays correctly
- [ ] Progress tracked separately per exam
- [ ] User can switch exams in settings
- [ ] All ENCOR content complete (150+ lessons, 500+ questions)
- [ ] All ENARSI content complete (140+ lessons, 450+ questions)
- [ ] Animations render without errors
- [ ] Quiz scoring accurate across all exams

---

## Phase 3: Advanced Features (FUTURE)

### Objectives
Enhance learning experience with hands-on labs, adaptive learning, and performance analytics.

### Planned Features:

#### 3.1 Hands-On Labs
- Embedded labs using:
  - Cisco Learning Network labs (IOU images)
  - GNS3 integration
  - Packet Tracer scenarios
- Lab progress tracking & grading
- Solution verification

#### 3.2 Adaptive Learning Engine
- Question difficulty adjustment based on performance
- Spaced repetition for weak areas
- Personalized study paths
- Time-optimized curriculum ordering

#### 3.3 Performance Analytics
- Detailed score breakdowns by domain
- Learning velocity metrics
- Predicted pass probability
- Weakness identification & recommendations
- Comparison with peers (optional)

#### 3.4 Social Features
- Study groups & forums
- Discussion threads per topic
- Peer Q&A
- Leaderboards (optional)
- Study session scheduling

#### 3.5 Marketplace & Gamification
- Premium content packs
- Custom study badges
- Achievement system expansion
- Certification path milestones

---

## Phase 4: Ecosystem Expansion (FUTURE)

### Potential Additions:
- CCNP Data Center (DCCOR, DCID)
- CCNP Cloud (exam TBD)
- CCNP Collaboration (exam TBD)
- Certified Network Associate certifications (other vendors)
- Hands-on lab environments
- Mobile app (React Native)
- Community contributions system

---

## Technical Debt & Maintenance

### Current Issues to Address:
- [ ] Optimize bundle size (currently ~12K+ lines in single HTML)
  - Consider splitting into modules
  - Lazy load animations
- [ ] Improve animation code reusability (reduce duplication)
- [ ] Add proper error handling for network failures
- [ ] Implement service worker for offline support
- [ ] Add automated testing (unit & e2e tests)

### Regular Maintenance:
- Monitor for Cisco exam updates & adjust content
- User feedback review & incorporation
- Performance optimization
- Security updates to dependencies

---

## Team Requirements

### Phase 2 Estimated Effort:
- **Content Writers:** 2 FTE (150+ ENCOR lessons, 140+ ENARSI lessons)
- **Animators/Developers:** 1 FTE (build 15-20 complex animations)
- **QA/Testing:** 1 FTE (validate 900+ questions, test all features)
- **Project Manager:** 0.5 FTE (coordination & tracking)
- **Total:** ~4.5 FTE for 12 weeks

### Skills Needed:
- CCNA & CCNP expertise (for technical accuracy)
- Full-stack web development
- UI/UX design
- Content creation & technical writing
- Testing & QA

---

## Success Criteria

### By End of Phase 2:
✅ Support CCNA, CCNP ENCOR, CCNP ENARSI  
✅ 300+ CCNA questions (existing)  
✅ 500+ ENCOR questions  
✅ 450+ ENARSI questions  
✅ User-selected curriculum on login  
✅ Separate progress tracking per exam  
✅ 15-20 advanced animations  
✅ 98%+ test pass rate for content  
✅ Average user session time: 45+ minutes  
✅ Quiz completion rate: 60%+  

---

## Notes & Considerations

- **CCNA Content Reuse:** ~30-40% of ENCOR content builds on CCNA; leverage animations & lessons
- **Difficulty Progression:** Ensure clear progression from CCNA → ENCOR → ENARSI
- **Content Accuracy:** Have Cisco-certified instructors review all content for exam alignment
- **Regular Updates:** Cisco exams update every 2-3 years; plan content refresh cycles
- **Community Feedback:** Gather user feedback on CCNA before expanding to CCNP

---

**Last Updated:** 2026-05-24  
**Status:** Phase 1 ✅ Complete | Phase 2 📋 Planned | Phase 3+ 🔮 Future
