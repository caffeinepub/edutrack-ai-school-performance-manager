import Array "mo:core/Array";
import Float "mo:core/Float";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  public type UserProfile = {
    name : Text;
  };

  type CredentialRole = {
    #teacher;
    #admin;
  };

  type CredentialUser = {
    username : Text;
    passwordHash : Text;
    name : Text;
    role : CredentialRole;
    createdAt : Time.Time;
  };

  type Session = {
    token : Text;
    username : Text;
    role : CredentialRole;
    name : Text;
    createdAt : Time.Time;
    expiry : Time.Time;
  };

  module CredentialRole {
    public func serialize(role : CredentialRole) : Text {
      switch (role) {
        case (#teacher) { "teacher" };
        case (#admin) { "admin" };
      };
    };

    public func deserialize(text : Text) : ?CredentialRole {
      if (text == "teacher") { ?#teacher } else if (text == "admin") { ?#admin } else {
        null;
      };
    };
  };

  module Session {
    public func compareByExpiry(session1 : Session, session2 : Session) : Order.Order {
      Int.compare(session1.expiry, session2.expiry);
    };
  };

  type Student = {
    id : Nat;
    name : Text;
    rollNumber : Text;
    className : Text;
    section : Text;
    parentPhone : Text;
  };

  module Student {
    public func compare(student1 : Student, student2 : Student) : Order.Order {
      Nat.compare(student1.id, student2.id);
    };
  };

  type Mark = {
    id : Nat;
    studentId : Nat;
    subject : Text;
    examType : Text;
    marks : Float;
    maxMarks : Float;
  };

  module Mark {
    public func compare(mark1 : Mark, mark2 : Mark) : Order.Order {
      if (mark1.studentId < mark2.studentId) { #less } else if (mark1.studentId > mark2.studentId) {
        #greater;
      } else {
        switch (Text.compare(mark1.subject, mark2.subject)) {
          case (#equal) { Nat.compare(mark1.id, mark2.id) };
          case (order) { order };
        };
      };
    };
  };

  type Feedback = {
    id : Nat;
    studentId : Nat;
    subject : Text;
    conceptClarity : Nat;
    homeworkCompletion : Bool;
    participation : Nat;
    behaviour : Nat;
    remarks : Text;
  };

  module Feedback {
    public func compare(feedback1 : Feedback, feedback2 : Feedback) : Order.Order {
      if (feedback1.studentId < feedback2.studentId) { #less } else if (feedback1.studentId > feedback2.studentId) {
        #greater;
      } else {
        switch (Text.compare(feedback1.subject, feedback2.subject)) {
          case (#equal) { Nat.compare(feedback1.id, feedback2.id) };
          case (order) { order };
        };
      };
    };
  };

  type StudentAnalysis = {
    isWeak : Bool;
    isHighRisk : Bool;
    weakSubjects : [Text];
    overallAverage : Float;
  };

  type AdminStats = {
    totalStudents : Nat;
    weakCount : Nat;
    highRiskCount : Nat;
  };

  type SubjectStat = {
    subject : Text;
    average : Float;
  };

  // AI Plans
  type AiPlan = {
    id : Nat;
    studentId : Nat;
    planVersion : Nat;
    generatedDate : Time.Time;
    basedOnAverage : Float;
    basedOnExamType : Text;
    performanceSnapshot : Text;
    aiPlanText : Text;
    improvementTargetPercentage : Float;
    status : Text;
  };

  var studentIdCounter = 1;
  var markIdCounter = 1;
  var feedbackIdCounter = 1;
  var aiPlanIdCounter = 1;

  // Credential system state
  let credentialUsers = Map.empty<Text, CredentialUser>();
  let sessions = Map.empty<Text, Session>();
  let SESSION_EXPIRY_MINUTES = 60;

  // School system state
  let students = Map.empty<Nat, Student>();
  let marks = Map.empty<Nat, Mark>();
  let feedbacks = Map.empty<Nat, Feedback>();
  let aiPlans = Map.empty<Nat, AiPlan>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  var accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  func repeatText(text : Text, times : Nat) : Text {
    var result = "";
    var count = 0;
    while (count < times) {
      result #= text;
      count += 1;
    };
    result;
  };

  ///////////////////////////
  // CREDENTIAL AUTH SYSTEM
  ///////////////////////////

  func getUserBySessionToken(token : Text) : ?Session {
    switch (sessions.get(token)) {
      case (null) { null };
      case (?session) {
        let currentTime = Time.now();
        if (session.expiry < currentTime) {
          sessions.remove(token);
          null;
        } else {
          ?session;
        };
      };
    };
  };

  public shared ({ caller }) func login(username : Text, password : Text) : async {
    #ok : { token : Text; role : Text; name : Text };
    #err : Text;
  } {
    // Login is accessible to anyone (including anonymous/guest)
    let userOpt = credentialUsers.get(username);
    switch (userOpt) {
      case (null) {
        #err("Invalid username or password");
      };
      case (?user) {
        let passwordHash = hashPassword(password);
        if (user.passwordHash != passwordHash) {
          return #err("Invalid username or password");
        };

        let token = generateSessionToken(username);
        let session : Session = {
          token;
          username = user.username;
          role = user.role;
          name = user.name;
          createdAt = Time.now();
          expiry = Time.now() + (SESSION_EXPIRY_MINUTES * 60 * 1_000_000_000);
        };
        sessions.add(token, session);

        #ok({
          token;
          role = CredentialRole.serialize(user.role);
          name = user.name;
        });
      };
    };
  };

  func hashPassword(password : Text) : Text {
    password.reverse();
  };

  func generateSessionToken(username : Text) : Text {
    username # "_" # Time.now().toText();
  };

  public shared ({ caller }) func validateSession(token : Text) : async ?{
    username : Text;
    role : Text;
    name : Text;
    createdAt : Time.Time;
  } {
    // Validation is accessible to anyone
    switch (getUserBySessionToken(token)) {
      case (null) { null };
      case (?session) {
        ?{
          username = session.username;
          role = CredentialRole.serialize(session.role);
          name = session.name;
          createdAt = session.createdAt;
        };
      };
    };
  };

  public shared ({ caller }) func logout(token : Text) : async Bool {
    // Logout is accessible to anyone
    switch (sessions.get(token)) {
      case (null) { false };
      case (?_) {
        sessions.remove(token);
        true;
      };
    };
  };

  public shared ({ caller }) func createTeacherAccount(sessionToken : Text, username : Text, password : Text, name : Text) : async {
    #ok;
    #err : Text;
  } {
    // Require admin permission via AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create teacher accounts");
    };

    switch (getUserBySessionToken(sessionToken)) {
      case (null) { #err("Invalid session token") };
      case (?session) {
        if (session.role != #admin) {
          return #err("Unauthorized: Only admins can create teacher accounts");
        };
        if (credentialUsers.get(username) != null) {
          return #err("Username already exists");
        };

        let user : CredentialUser = {
          username;
          passwordHash = hashPassword(password);
          name;
          role = #teacher;
          createdAt = Time.now();
        };
        credentialUsers.add(username, user);
        #ok;
      };
    };
  };

  public shared ({ caller }) func deleteTeacherAccount(sessionToken : Text, username : Text) : async {
    #ok;
    #err : Text;
  } {
    // Require admin permission via AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete teacher accounts");
    };

    switch (getUserBySessionToken(sessionToken)) {
      case (null) { #err("Invalid session token") };
      case (?session) {
        if (session.role != #admin) {
          return #err("Unauthorized: Only admins can delete teacher accounts");
        };
        switch (credentialUsers.get(username)) {
          case (null) { #err("Teacher account not found") };
          case (?user) {
            if (user.role == #admin) {
              return #err("Cannot delete admin account");
            };
            credentialUsers.remove(username);
            #ok;
          };
        };
      };
    };
  };

  public shared ({ caller }) func changePassword(sessionToken : Text, oldPassword : Text, newPassword : Text) : async {
    #ok;
    #err : Text;
  } {
    // Require user permission via AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can change passwords");
    };

    switch (getUserBySessionToken(sessionToken)) {
      case (null) { #err("Invalid session token") };
      case (?session) {
        switch (credentialUsers.get(session.username)) {
          case (null) { #err("User not found") };
          case (?user) {
            let oldPasswordHash = hashPassword(oldPassword);
            if (user.passwordHash != oldPasswordHash) {
              return #err("Old password is incorrect");
            };
            let updatedUser : CredentialUser = {
              username = user.username;
              passwordHash = hashPassword(newPassword);
              name = user.name;
              role = user.role;
              createdAt = user.createdAt;
            };
            credentialUsers.add(session.username, updatedUser);
            #ok;
          };
        };
      };
    };
  };

  public shared ({ caller }) func listTeacherAccounts(sessionToken : Text) : async {
    #ok : [{ username : Text; name : Text; role : Text }];
    #err : Text;
  } {
    // Require admin permission via AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view teacher accounts");
    };

    switch (getUserBySessionToken(sessionToken)) {
      case (null) { #err("Invalid session token") };
      case (?session) {
        if (session.role != #admin) {
          return #err("Unauthorized: Only admins can view teacher accounts");
        };
        let teacherAccounts = credentialUsers.values().toArray().filter(
          func(user) { CredentialRole.serialize(user.role) == "teacher" }
        );
        let teacherAccountsArray = teacherAccounts.map(
          func(user) { { username = user.username; name = user.name; role = CredentialRole.serialize(user.role) } }
        );
        #ok(teacherAccountsArray);
      };
    };
  };

  public shared ({ caller }) func getCurrentUserInfo(sessionToken : Text) : async {
    #ok : { username : Text; name : Text; role : Text };
    #err : Text;
  } {
    // Require user permission via AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access user info");
    };

    switch (getUserBySessionToken(sessionToken)) {
      case (null) { #err("Session not valid or expired") };
      case (?session) {
        #ok({
          username = session.username;
          name = session.name;
          role = CredentialRole.serialize(session.role);
        });
      };
    };
  };

  ///////////////////////////
  // User Profile Functions
  ///////////////////////////

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  ///////////////////////////
  // Student CRUD
  ///////////////////////////

  public shared ({ caller }) func createStudent(sessionToken : Text, name : Text, rollNumber : Text, className : Text, section : Text, parentPhone : Text) : async Nat {
    // Require user permission via AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create students");
    };

    switch (getUserBySessionToken(sessionToken)) {
      case (null) {
        Runtime.trap("Unauthorized: Invalid session token");
      };
      case (?_) {};
    };

    let id = studentIdCounter;
    let student : Student = {
      id;
      name;
      rollNumber;
      className;
      section;
      parentPhone;
    };
    students.add(id, student);
    studentIdCounter += 1;
    id;
  };

  public query ({ caller }) func getStudent(sessionToken : Text, id : Nat) : async ?Student {
    // Require user permission via AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view students");
    };

    switch (getUserBySessionToken(sessionToken)) {
      case (null) {
        Runtime.trap("Unauthorized: Invalid session token");
      };
      case (?_) {};
    };
    students.get(id);
  };

  public shared ({ caller }) func updateStudent(sessionToken : Text, id : Nat, name : Text, rollNumber : Text, className : Text, section : Text, parentPhone : Text) : async Bool {
    // Require user permission via AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update students");
    };

    switch (getUserBySessionToken(sessionToken)) {
      case (null) {
        Runtime.trap("Unauthorized: Invalid session token");
      };
      case (?_) {};
    };

    switch (students.get(id)) {
      case (null) { false };
      case (?_) {
        let updatedStudent : Student = {
          id;
          name;
          rollNumber;
          className;
          section;
          parentPhone;
        };
        students.add(id, updatedStudent);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteStudent(sessionToken : Text, id : Nat) : async Bool {
    // Require user permission via AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete students");
    };

    switch (getUserBySessionToken(sessionToken)) {
      case (null) {
        Runtime.trap("Unauthorized: Invalid session token");
      };
      case (?_) {};
    };

    switch (students.get(id)) {
      case (null) { false };
      case (?_) {
        students.remove(id);
        true;
      };
    };
  };

  public query ({ caller }) func getAllStudents(sessionToken : Text) : async [Student] {
    // Require user permission via AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view students");
    };

    switch (getUserBySessionToken(sessionToken)) {
      case (null) {
        Runtime.trap("Unauthorized: Invalid session token");
      };
      case (?_) {};
    };
    students.values().toArray().sort();
  };

  ///////////////////////////
  // Marks CRUD
  ///////////////////////////

  public shared ({ caller }) func addMark(sessionToken : Text, studentId : Nat, subject : Text, examType : Text, marksValue : Float, maxMarks : Float) : async Nat {
    // Require user permission via AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add marks");
    };

    switch (getUserBySessionToken(sessionToken)) {
      case (null) {
        Runtime.trap("Unauthorized: Invalid session token");
      };
      case (?_) {};
    };

    let id = markIdCounter;
    let mark : Mark = {
      id;
      studentId;
      subject;
      examType;
      marks = marksValue;
      maxMarks;
    };
    marks.add(id, mark);
    markIdCounter += 1;
    id;
  };

  public query ({ caller }) func getMarksByStudent(sessionToken : Text, studentId : Nat) : async [Mark] {
    // Require user permission via AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view marks");
    };

    switch (getUserBySessionToken(sessionToken)) {
      case (null) {
        Runtime.trap("Unauthorized: Invalid session token");
      };
      case (?_) {};
    };
    marks.values().toArray().filter(func(m) { m.studentId == studentId });
  };

  public query ({ caller }) func getAllMarks(sessionToken : Text) : async [Mark] {
    // Require user permission via AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view marks");
    };

    switch (getUserBySessionToken(sessionToken)) {
      case (null) {
        Runtime.trap("Unauthorized: Invalid session token");
      };
      case (?_) {};
    };
    marks.values().toArray().sort();
  };

  ///////////////////////////
  // Feedback CRUD
  ///////////////////////////

  public shared ({ caller }) func addFeedback(sessionToken : Text, studentId : Nat, subject : Text, conceptClarity : Nat, homeworkCompletion : Bool, participation : Nat, behaviour : Nat, remarks : Text) : async Nat {
    // Require user permission via AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add feedback");
    };

    switch (getUserBySessionToken(sessionToken)) {
      case (null) {
        Runtime.trap("Unauthorized: Invalid session token");
      };
      case (?_) {};
    };

    let id = feedbackIdCounter;
    let feedback : Feedback = {
      id;
      studentId;
      subject;
      conceptClarity;
      homeworkCompletion;
      participation;
      behaviour;
      remarks;
    };
    feedbacks.add(id, feedback);
    feedbackIdCounter += 1;
    id;
  };

  public query ({ caller }) func getFeedbackByStudent(sessionToken : Text, studentId : Nat) : async [Feedback] {
    // Require user permission via AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view feedback");
    };

    switch (getUserBySessionToken(sessionToken)) {
      case (null) {
        Runtime.trap("Unauthorized: Invalid session token");
      };
      case (?_) {};
    };
    feedbacks.values().toArray().filter(func(f) { f.studentId == studentId });
  };

  public query ({ caller }) func getAllFeedback(sessionToken : Text) : async [Feedback] {
    // Require user permission via AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view feedback");
    };

    switch (getUserBySessionToken(sessionToken)) {
      case (null) {
        Runtime.trap("Unauthorized: Invalid session token");
      };
      case (?_) {};
    };
    feedbacks.values().toArray().sort();
  };

  ///////////////////////////
  // Analysis Functions
  ///////////////////////////

  public query ({ caller }) func getStudentAnalysis(sessionToken : Text, studentId : Nat) : async StudentAnalysis {
    // Require user permission via AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view analysis");
    };

    switch (getUserBySessionToken(sessionToken)) {
      case (null) {
        Runtime.trap("Unauthorized: Invalid session token");
      };
      case (?_) {};
    };

    let studentMarks = marks.values().toArray().filter(func(m) { m.studentId == studentId });

    if (studentMarks.size() == 0) {
      return {
        isWeak = false;
        isHighRisk = false;
        weakSubjects = [];
        overallAverage = 0.0;
      };
    };

    var totalPercentage : Float = 0.0;
    var subjectMap = Map.empty<Text, (Float, Float)>();

    for (mark in studentMarks.vals()) {
      let percentage = (mark.marks / mark.maxMarks) * 100.0;
      totalPercentage += percentage;

      switch (subjectMap.get(mark.subject)) {
        case (null) {
          subjectMap.add(mark.subject, (mark.marks, mark.maxMarks));
        };
        case (?(existingMarks, existingMax)) {
          subjectMap.add(mark.subject, (existingMarks + mark.marks, existingMax + mark.maxMarks));
        };
      };
    };

    let overallAverage = totalPercentage / studentMarks.size().toFloat();

    var weakSubjectsList : [Text] = [];
    for ((subject, (totalMarks, totalMax)) in subjectMap.entries()) {
      let subjectAverage = (totalMarks / totalMax) * 100.0;
      if (subjectAverage < 40.0) {
        weakSubjectsList := weakSubjectsList.concat([subject]);
      };
    };

    let isWeak = overallAverage < 50.0;
    let isHighRisk = overallAverage < 40.0 or weakSubjectsList.size() >= 3;

    {
      isWeak;
      isHighRisk;
      weakSubjects = weakSubjectsList;
      overallAverage;
    };
  };

  public query ({ caller }) func getAdminStats(sessionToken : Text) : async AdminStats {
    // Require admin permission via AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view statistics");
    };

    switch (getUserBySessionToken(sessionToken)) {
      case (null) {
        Runtime.trap("Unauthorized: Invalid session token");
      };
      case (?session) {
        if (session.role != #admin) {
          Runtime.trap("Unauthorized: Only admins can view statistics");
        };
      };
    };

    let totalStudents = students.size();
    var weakCount = 0;
    var highRiskCount = 0;

    for (student in students.values()) {
      let studentMarks = marks.values().toArray().filter(func(m) { m.studentId == student.id });

      if (studentMarks.size() > 0) {
        var totalPercentage : Float = 0.0;
        var subjectMap = Map.empty<Text, (Float, Float)>();

        for (mark in studentMarks.vals()) {
          let percentage = (mark.marks / mark.maxMarks) * 100.0;
          totalPercentage += percentage;

          switch (subjectMap.get(mark.subject)) {
            case (null) {
              subjectMap.add(mark.subject, (mark.marks, mark.maxMarks));
            };
            case (?(existingMarks, existingMax)) {
              subjectMap.add(mark.subject, (existingMarks + mark.marks, existingMax + mark.maxMarks));
            };
          };
        };

        let overallAverage = totalPercentage / studentMarks.size().toFloat();

        var weakSubjectsCount = 0;
        for ((subject, (totalMarks, totalMax)) in subjectMap.entries()) {
          let subjectAverage = (totalMarks / totalMax) * 100.0;
          if (subjectAverage < 40.0) {
            weakSubjectsCount += 1;
          };
        };

        if (overallAverage < 50.0) {
          weakCount += 1;
        };

        if (overallAverage < 40.0 or weakSubjectsCount >= 3) {
          highRiskCount += 1;
        };
      };
    };

    {
      totalStudents;
      weakCount;
      highRiskCount;
    };
  };

  ///////////////////////////
  // AI Improved Plans
  ///////////////////////////
  func generatePlanText(planType : Text, subject : Text, performanceSnapshot : Text, improvementTarget : Float) : Text {
    let base = "\n" # repeatText("=", 60) # "\n\n";
    let goal = "GOAL: Improve " # subject # " to " # improvementTarget.toText() # "%\n";
    let summary = "\nPERFORMANCE ANALYSIS:\n" # performanceSnapshot;
    let basePlan = "\nBASE IMPROVEMENT PLAN:\n" # goal # summary;
    let basicPlan = "\nBASIC STRUCTURE:\n1. Focus weak topics first\n2. Practice daily\n3. Weekly review\n4. Parent tips\n\n" # basePlan;

    let unitTestPlan = "\nUNIT TEST IMPROVEMENT PLAN\n1. Prioritize chapter summaries\n2. Practice questions daily\n3. Regular reviews\n4. Parent support\n\n" # basePlan;

    let halfYearlyPlan = "\nHALF YEARLY PREPARATION PLAN\n1. Comprehensive revision\n2. Regular homework+tests\n3. Class participation\n4. Parent-student teamwork\n\n" # basePlan;

    let focusPlan = if (planType == "Unit Test") {
      unitTestPlan;
    } else if (planType == "Half Yearly") {
      halfYearlyPlan;
    } else { basicPlan };
    let structure = "\nWEEKLY GUIDE (incl. daily study schedule+suggested parent checklist):\n" # focusPlan # "\nWeek 1: Master fundamentals\n\nWeek 2: Focus on weak chapters\n\nWeek 3: Practice with past papers+tests\n\nWeek 4: Intensive revision+final review\n";
    structure # "\nSUCCESS INDICATORS:\n1. Regular homework completion\n2. Improved test scores\n3. Consistent performance\n4. Parent-teacher collaboration\n";
  };

  func fetchLatestAiPlan(studentId : Nat, examType : Text) : ?AiPlan {
    var latestPlan : ?AiPlan = null;
    for (plan in aiPlans.values()) {
      if (plan.studentId == studentId and plan.basedOnExamType == examType) {
        switch (latestPlan) {
          case (null) {
            latestPlan := ?plan;
          };
          case (?existing) {
            if (plan.planVersion > existing.planVersion) {
              latestPlan := ?plan;
            };
          };
        };
      };
    };
    latestPlan;
  };

  func buildPerformanceSnapshot(student : Student, subject : Text, _marks : [Mark], _feedback : [Feedback]) : Text {
    var snapshot = "---- STUDENT PROFILE ----\n" # "Name: " # student.name # " (Roll: " # student.rollNumber # ")\n" # "Subject: " # subject # "\n" # "Class: " # student.className # " - " # student.section # "\n\n";
    snapshot #= repeatText("-", 60) # "\n";

    let subjectMarks = _marks.filter(func(m) { m.subject == subject });
    if (subjectMarks.size() > 0) {
      var totalMarks : Float = 0.0;
      var totalMax : Float = 0.0;
      for (mark in subjectMarks.vals()) {
        totalMarks += mark.marks;
        totalMax += mark.maxMarks;
      };

      let average = (totalMarks / totalMax) * 100.0;
      snapshot #= "Subject Average: " # average.toText() # "%\n";
      snapshot #= "Highest Score: " # subjectMarks.values().foldLeft(totalMarks, func(acc, m) { if (m.marks > acc) { m.marks } else { acc } }).toText() # "\n";
      snapshot #= "Lowest Score: " # subjectMarks.values().foldLeft(totalMarks, func(acc, m) { if (m.marks < acc) { m.marks } else { acc } }).toText() # "\n";
    };

    let subjectFeedbacks = _feedback.filter(func(f) { f.subject == subject });
    if (subjectFeedbacks.size() > 0) {
      var conceptTotal = 0;
      var participationTotal = 0;

      for (fb in subjectFeedbacks.vals()) {
        conceptTotal += fb.conceptClarity;
        participationTotal += fb.participation;
      };

      let conceptAverage = conceptTotal.toFloat() / subjectFeedbacks.size().toFloat();
      let participationAverage = participationTotal.toFloat() / subjectFeedbacks.size().toFloat();

      snapshot #= "\nFEEDBACK ANALYSIS\n";
      snapshot #= "Concept Clarity: " # conceptAverage.toText() # " (1-5)\n";
      snapshot #= "Participation: " # participationAverage.toText() # " (1-5)\n";
    };

    snapshot;
  };

  // Save and version AI PLAN
  public shared ({ caller }) func generateAndSaveAiPlan(sessionToken : Text, studentId : Nat, forceRegenerate : Bool) : async {
    #ok : AiPlan;
    #err : Text;
  } {
    // Require user permission via AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can generate AI plans");
    };

    switch (getUserBySessionToken(sessionToken)) {
      case (null) { #err("Invalid session token") };
      case (?_) {
        switch (students.get(studentId)) {
          case (null) { #err("Student not found") };
          case (?student) {
            let studentMarks = marks.values().toArray().filter(func(m) { m.studentId == studentId });
            let studentFeedback = feedbacks.values().toArray().filter(func(f) { f.studentId == studentId });

            if (studentMarks.size() == 0) {
              return #err("No marks available for this student to generate improvement plan");
            };

            var summaries : [Text] = [];
            var exams : [Text] = ["Unit Test", "Half Yearly"];
            var averages : [Float] = [];
            var currentSubject : Text = "";

            for (examType in exams.vals()) {
              let subjectArray = [studentMarks[0].subject];
              for (subject in subjectArray.vals()) {
                currentSubject := subject;

                let examMarks = studentMarks.filter(func(m) { m.subject == subject and m.examType == examType });

                if (examMarks.size() > 0) {
                  var totalMarks : Float = 0.0;
                  var totalMax : Float = 0.0;
                  for (mark in examMarks.vals()) {
                    totalMarks += mark.marks;
                    totalMax += mark.maxMarks;
                  };

                  let average = (totalMarks / totalMax) * 100.0;
                  averages := averages.concat([average]);

                  let summary = "Subject: " # subject # "\nExam: " # examType # "\nAverage: " # average.toText() # "%\n";
                  summaries := summaries.concat([summary]);
                };
              };
            };

            let performanceSnapshot = buildPerformanceSnapshot(student, currentSubject, studentMarks, studentFeedback);

            let improvementTarget = Float.min(averages.foldLeft(0.0, func(acc, x) { acc + x }) / averages.size().toFloat() + 17.0, 95.0);

            let planText = generatePlanText("Half Yearly", currentSubject, performanceSnapshot, improvementTarget);

            let newPlan : AiPlan = {
              id = aiPlanIdCounter;
              studentId;
              planVersion = 1;
              generatedDate = Time.now();
              basedOnAverage = improvementTarget;
              basedOnExamType = "Half Yearly";
              performanceSnapshot;
              aiPlanText = planText;
              improvementTargetPercentage = improvementTarget;
              status = "Active";
            };

            aiPlans.add(aiPlanIdCounter, newPlan);
            aiPlanIdCounter += 1;

            #ok(newPlan);
          };
        };
      };
    };
  };

  public shared ({ caller }) func generateImprovementPlan(sessionToken : Text, studentId : Nat) : async Text {
    // Require user permission via AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can generate improvement plans");
    };

    switch (getUserBySessionToken(sessionToken)) {
      case (null) { Runtime.trap("Unauthorized: Invalid session token") };
      case (?_) {};
    };

    let studentOpt = students.get(studentId);
    switch (studentOpt) {
      case (null) { return "Student not found" };
      case (?student) {
        let studentMarks = marks.values().toArray().filter(func(m) { m.studentId == studentId });
        let studentFeedback = feedbacks.values().toArray().filter(func(f) { f.studentId == studentId });

        if (studentMarks.size() == 0) {
          return "No marks available for this student to generate an improvement plan.";
        };

        let unitTestPlan = switch (await generateAndSaveAiPlan(sessionToken, studentId, false)) {
          case (#ok(aiPlan)) { aiPlan.aiPlanText };
          case (#err(_)) { "" };
        };
        unitTestPlan;
      };
    };
  };

  public query ({ caller }) func getAiPlansByStudent(sessionToken : Text, studentId : Nat) : async [AiPlan] {
    // Require user permission via AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view AI plans");
    };

    switch (getUserBySessionToken(sessionToken)) {
      case (null) { Runtime.trap("Unauthorized: Invalid session token") };
      case (?_) {};
    };
    aiPlans.values().toArray().filter(func(plan) { plan.studentId == studentId });
  };

  public shared ({ caller }) func updateAiPlanStatus(sessionToken : Text, planId : Nat, status : Text) : async {
    #ok;
    #err : Text;
  } {
    // Require user permission via AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update AI plan status");
    };

    switch (getUserBySessionToken(sessionToken)) {
      case (null) { #err("Invalid session token") };
      case (?_) {
        switch (aiPlans.get(planId)) {
          case (null) { #err("Plan not found") };
          case (?plan) {
            let updatedPlan : AiPlan = {
              id = planId;
              studentId = plan.studentId;
              planVersion = plan.planVersion;
              generatedDate = plan.generatedDate;
              basedOnAverage = plan.basedOnAverage;
              basedOnExamType = plan.basedOnExamType;
              performanceSnapshot = plan.performanceSnapshot;
              aiPlanText = plan.aiPlanText;
              improvementTargetPercentage = plan.improvementTargetPercentage;
              status;
            };
            aiPlans.add(planId, updatedPlan);
            #ok;
          };
        };
      };
    };
  };

  public query ({ caller }) func getLatestAiPlan(sessionToken : Text, studentId : Nat) : async ?AiPlan {
    // Require user permission via AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view AI plans");
    };

    switch (getUserBySessionToken(sessionToken)) {
      case (null) { Runtime.trap("Unauthorized: Invalid session token") };
      case (?_) {};
    };

    var latestPlan : ?AiPlan = null;
    for (plan in aiPlans.values()) {
      if (plan.studentId == studentId) {
        switch (latestPlan) {
          case (null) {
            latestPlan := ?plan;
          };
          case (?existing) {
            if (plan.planVersion > existing.planVersion) {
              latestPlan := ?plan;
            };
          };
        };
      };
    };
    latestPlan;
  };

  ///////////////////////////
  // Initialization with Seed Data
  ///////////////////////////

  func seedCredentialData() {
    if (credentialUsers.get("admin") == null) {
      let adminUser : CredentialUser = {
        username = "admin";
        passwordHash = hashPassword("admin123");
        name = "Administrator";
        role = #admin;
        createdAt = Time.now();
      };
      credentialUsers.add("admin", adminUser);
    };

    if (credentialUsers.get("teacher1") == null) {
      let teacherUser1 : CredentialUser = {
        username = "teacher1";
        passwordHash = hashPassword("teacher123");
        name = "John Smith";
        role = #teacher;
        createdAt = Time.now();
      };
      credentialUsers.add("teacher1", teacherUser1);
    };

    if (credentialUsers.get("teacher2") == null) {
      let teacherUser2 : CredentialUser = {
        username = "teacher2";
        passwordHash = hashPassword("teacher123");
        name = "Sarah Johnson";
        role = #teacher;
        createdAt = Time.now();
      };
      credentialUsers.add("teacher2", teacherUser2);
    };
  };

  func seedSchoolData() {
    if (students.size() == 0) {
      let studentNames = [
        ("Aarav Kumar", "2024001", "10", "A", "+91-9876543210"),
        ("Diya Sharma", "2024002", "10", "A", "+91-9876543211"),
        ("Arjun Patel", "2024003", "10", "B", "+91-9876543212"),
        ("Ananya Singh", "2024004", "10", "B", "+91-9876543213"),
        ("Vihaan Reddy", "2024005", "9", "A", "+91-9876543214"),
        ("Isha Gupta", "2024006", "9", "A", "+91-9876543215"),
        ("Aditya Verma", "2024007", "9", "B", "+91-9876543216"),
        ("Saanvi Joshi", "2024008", "9", "B", "+91-9876543217"),
        ("Reyansh Mehta", "2024009", "8", "A", "+91-9876543218"),
        ("Myra Kapoor", "2024010", "8", "A", "+91-9876543219"),
        ("Kabir Nair", "2024011", "8", "B", "+91-9876543220"),
        ("Kiara Desai", "2024012", "8", "B", "+91-9876543221"),
        ("Ayaan Shah", "2024013", "7", "A", "+91-9876543222"),
        ("Navya Iyer", "2024014", "7", "A", "+91-9876543223"),
        ("Vivaan Rao", "2024015", "7", "B", "+91-9876543224"),
      ];

      for ((name, roll, class_, section, phone) in studentNames.vals()) {
        let id = studentIdCounter;
        let student : Student = {
          id;
          name;
          rollNumber = roll;
          className = class_;
          section;
          parentPhone = phone;
        };
        students.add(id, student);
        studentIdCounter += 1;
      };

      let subjects = ["Mathematics", "Science", "English", "Social Studies", "Hindi", "Computer Science"];
      let examTypes = ["Unit Test", "Half Yearly"];

      for (studentId in Nat.range(1, 15)) {
        for (subject in subjects.vals()) {
          for (examType in examTypes.vals()) {
            let id = markIdCounter;
            let marksValue = if (studentId <= 3 and (subject == "Mathematics" or subject == "Science")) {
              30.0 + (studentId * 2).toFloat();
            } else if (studentId >= 13 and subject == "English") {
              35.0 + studentId.toFloat();
            } else {
              50.0 + ((studentId * 3 + markIdCounter) % 45).toFloat();
            };

            let mark : Mark = {
              id;
              studentId;
              subject;
              examType;
              marks = marksValue;
              maxMarks = 100.0;
            };
            marks.add(id, mark);
            markIdCounter += 1;
          };
        };
      };
    };
  };

  public shared ({ caller }) func initializeApp() : async Text {
    // This function is intentionally accessible to anyone (including anonymous)
    // because it's designed to be called by the frontend on startup
    // and the seed functions are idempotent (safe to call multiple times)
    seedCredentialData();
    seedSchoolData();
    "initialized";
  };

  public func constructor() {
    seedCredentialData();
    seedSchoolData();
  };
};
