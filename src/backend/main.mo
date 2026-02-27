import Array "mo:core/Array";
import Float "mo:core/Float";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

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

  var studentIdCounter = 1;
  var markIdCounter = 1;
  var feedbackIdCounter = 1;

  // Credential system state
  let credentialUsers = Map.empty<Text, CredentialUser>();
  let sessions = Map.empty<Text, Session>();
  let SESSION_EXPIRY_MINUTES = 60;

  // School system state
  let students = Map.empty<Nat, Student>();
  let marks = Map.empty<Nat, Mark>();
  let feedbacks = Map.empty<Nat, Feedback>();
  let userProfiles = Map.empty<Principal, UserProfile>();

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
    switch (getUserBySessionToken(sessionToken)) {
      case (null) {
        Runtime.trap("Unauthorized: Invalid session token");
      };
      case (?_) {};
    };
    students.get(id);
  };

  public shared ({ caller }) func updateStudent(sessionToken : Text, id : Nat, name : Text, rollNumber : Text, className : Text, section : Text, parentPhone : Text) : async Bool {
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
    switch (getUserBySessionToken(sessionToken)) {
      case (null) {
        Runtime.trap("Unauthorized: Invalid session token");
      };
      case (?_) {};
    };
    marks.values().toArray().filter(func(m) { m.studentId == studentId });
  };

  public query ({ caller }) func getAllMarks(sessionToken : Text) : async [Mark] {
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
    switch (getUserBySessionToken(sessionToken)) {
      case (null) {
        Runtime.trap("Unauthorized: Invalid session token");
      };
      case (?_) {};
    };
    feedbacks.values().toArray().filter(func(f) { f.studentId == studentId });
  };

  public query ({ caller }) func getAllFeedback(sessionToken : Text) : async [Feedback] {
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

  public query ({ caller }) func generateImprovementPlan(sessionToken : Text, studentId : Nat) : async Text {
    switch (getUserBySessionToken(sessionToken)) {
      case (null) {
        Runtime.trap("Unauthorized: Invalid session token");
      };
      case (?_) {};
    };

    let studentOpt = students.get(studentId);
    switch (studentOpt) {
      case (null) { return "Student not found"; };
      case (?student) {
        let studentMarks = marks.values().toArray().filter(func(m) { m.studentId == studentId });
        let studentFeedback = feedbacks.values().toArray().filter(func(f) { f.studentId == studentId });

        if (studentMarks.size() == 0) {
          return "No marks available for this student to generate an improvement plan.";
        };

        var subjectMap = Map.empty<Text, (Float, Float)>();
        for (mark in studentMarks.vals()) {
          switch (subjectMap.get(mark.subject)) {
            case (null) {
              subjectMap.add(mark.subject, (mark.marks, mark.maxMarks));
            };
            case (?(existingMarks, existingMax)) {
              subjectMap.add(mark.subject, (existingMarks + mark.marks, existingMax + mark.maxMarks));
            };
          };
        };

        var plan = "IMPROVEMENT PLAN FOR: " # student.name # " (Roll: " # student.rollNumber # ")\n";
        plan #= "Class: " # student.className # " - " # student.section # "\n";
        plan #= repeatText("=", 60) # "\n\n";

        var weakSubjects : [Text] = [];
        for ((subject, (totalMarks, totalMax)) in subjectMap.entries()) {
          let subjectAverage = (totalMarks / totalMax) * 100.0;
          if (subjectAverage < 40.0) {
            weakSubjects := weakSubjects.concat([subject]);
          };
        };

        if (weakSubjects.size() == 0) {
          plan #= "Student is performing well in all subjects. Continue current study habits.\n";
        } else {
          plan #= "WEAK SUBJECTS IDENTIFIED:\n";
          for (subject in weakSubjects.vals()) {
            switch (subjectMap.get(subject)) {
              case (?(totalMarks, totalMax)) {
                let avg = (totalMarks / totalMax) * 100.0;
                plan #= "- " # subject # " (Average: " # avg.toText() # "%)\n";
              };
              case (null) {};
            };
          };

          plan #= "\nRECOMMENDATIONS:\n";
          for (subject in weakSubjects.vals()) {
            plan #= "\n" # subject # ":\n";
            plan #= "  * Schedule extra practice sessions\n";
            plan #= "  * Review fundamental concepts\n";
            plan #= "  * Seek help from teachers during office hours\n";
            plan #= "  * Form study groups with peers\n";

            let subjectFeedback = studentFeedback.filter(func(f) { f.subject == subject });
            for (fb in subjectFeedback.vals()) {
              if (fb.conceptClarity < 3) {
                plan #= "  * Focus on concept clarity (currently low)\n";
              };
              if (not fb.homeworkCompletion) {
                plan #= "  * Ensure timely homework completion\n";
              };
              if (fb.participation < 3) {
                plan #= "  * Increase class participation\n";
              };
              if (fb.remarks != "") {
                plan #= "  * Teacher's note: " # fb.remarks # "\n";
              };
            };
          };

          plan #= "\nGENERAL RECOMMENDATIONS:\n";
          plan #= "- Create a structured study timetable\n";
          plan #= "- Allocate more time to weak subjects\n";
          plan #= "- Regular practice and revision\n";
          plan #= "- Parent involvement: Contact " # student.parentPhone # "\n";
        };

        plan #= "\n" # repeatText("=", 60) # "\n";
        plan;
      };
    };
  };

  ///////////////////////////
  // Initialization with Seed Data
  ///////////////////////////

  func seedCredentialData() {
    let adminUser : CredentialUser = {
      username = "admin";
      passwordHash = hashPassword("admin123");
      name = "Administrator";
      role = #admin;
      createdAt = Time.now();
    };
    credentialUsers.add("admin", adminUser);

    let teacherUser1 : CredentialUser = {
      username = "teacher1";
      passwordHash = hashPassword("teacher123");
      name = "John Smith";
      role = #teacher;
      createdAt = Time.now();
    };
    credentialUsers.add("teacher1", teacherUser1);

    let teacherUser2 : CredentialUser = {
      username = "teacher2";
      passwordHash = hashPassword("teacher123");
      name = "Sarah Johnson";
      role = #teacher;
      createdAt = Time.now();
    };
    credentialUsers.add("teacher2", teacherUser2);
  };

  func seedSchoolData() {
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

  system func postupgrade() {
    seedCredentialData();
    seedSchoolData();
  };
};
