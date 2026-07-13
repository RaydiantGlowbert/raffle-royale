(function () {
  function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  function runTests() {
    const appHooks = window.RaffleRoyaleAppTestHooks;
    const serviceHooks = window.RaffleRoyaleSubmissionTestHooks;
    const storageHooks = window.RaffleRoyaleStorageTestHooks;

    if (!appHooks || !serviceHooks || !storageHooks) {
      throw new Error("Test hooks were not found. Ensure app.js, submissionService.js, and storage.js are loaded.");
    }

    const lines = [];
    let passed = 0;
    let failed = 0;

    storageHooks.clearSavedSubmissions();
    storageHooks.clearSavedApiHealthHistory();
    storageHooks.clearParticipantCompletionStatus();

    function test(name, fn) {
      try {
        fn();
        passed += 1;
        lines.push(`PASS: ${name}`);
      } catch (error) {
        failed += 1;
        lines.push(`FAIL: ${name} -> ${error.message}`);
      }
    }

    function createValidEntry(overrides) {
      const safeOverrides = overrides || {};
      return {
        participantId: safeOverrides.participantId || "participant-test-1",
        submissionId: safeOverrides.submissionId || "submission-test-1",
        submittedAt: safeOverrides.submittedAt || "2026-07-11T12:00:00.000Z",
        participantName: safeOverrides.participantName || "Jamie T",
        firstName: safeOverrides.firstName || "Jamie",
        lastInitial: safeOverrides.lastInitial || "T",
        mode: safeOverrides.mode || "pilot",
        totalTickets: safeOverrides.totalTickets || 20,
        allocations: safeOverrides.allocations || { p1: 10, p2: 5, p3: 5, p4: 0, p5: 0 }
      };
    }

    test("Pilot mode configuration is active", function () {
      assert(appHooks.PILOT_MODE === true, "PILOT_MODE should be true for pilot testing");
      assert(appHooks.APP_MODE === "pilot", "APP_MODE should be pilot");
    });

    test("Participant ID persists across reads until reset", function () {
      const idOne = storageHooks.getOrCreateParticipantId();
      const idTwo = storageHooks.getOrCreateParticipantId();
      assert(Boolean(idOne), "participant ID should be created");
      assert(idOne === idTwo, "participant ID should persist");
    });

    test("Submission ID generation is unique", function () {
      const one = serviceHooks.normalizeSubmissionEntry({ participantName: "Alex R", allocations: { p1: 20 } });
      const two = serviceHooks.normalizeSubmissionEntry({ participantName: "Alex R", allocations: { p1: 20 } });
      assert(one.submissionId !== two.submissionId, "submission IDs should be unique");
    });

    test("Name validation accepts first + last initial", function () {
      assert(appHooks.isValidParticipantName("Taylor M"), "Expected valid name to pass");
      assert(!appHooks.isValidParticipantName("Taylor Morgan"), "Expected full last name to fail");
      assert(!appHooks.isValidParticipantName("Taylor"), "Expected missing initial to fail");
    });

    test("Ticket allocation cannot exceed total and cannot go below zero", function () {
      let allocations = { p1: 20, p2: 0, p3: 0, p4: 0, p5: 0 };
      allocations = appHooks.applyTicketAction(allocations, "increment", "p2");
      assert(allocations.p2 === 0, "Increment should be blocked when total is exhausted");

      allocations = { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0 };
      allocations = appHooks.applyTicketAction(allocations, "decrement", "p1");
      assert(allocations.p1 === 0, "Decrement should never drop below zero");

      allocations = appHooks.applyTicketAction(allocations, "increment", "p1");
      assert(allocations.p1 === 1, "Increment should work when tickets remain");
    });

    test("Submission normalization captures required pilot fields", function () {
      const normalized = serviceHooks.normalizeSubmissionEntry({
        participantId: "participant-1",
        participantName: "Jamie T",
        allocations: { p1: 3, p2: 2 }
      });

      assert(Boolean(normalized.participantId), "participantId missing");
      assert(Boolean(normalized.mode), "mode missing");
      assert(Boolean(normalized.submissionId), "submissionId missing");
      assert(Boolean(normalized.submittedAt), "submittedAt missing");
      assert(normalized.firstName === "Jamie", "firstName not captured");
      assert(normalized.lastInitial === "T", "lastInitial not captured");
      assert(normalized.allocations.p1 === 3, "allocation p1 mismatch");
      assert(normalized.allocations.p3 === 0, "missing prize buckets should normalize to zero");
    });

    test("Validation rejects incorrect total ticket count", function () {
      const invalid = createValidEntry({
        totalTickets: 19,
        allocations: { p1: 19, p2: 0, p3: 0, p4: 0, p5: 0 }
      });

      let threw = false;
      try {
        serviceHooks.validateSubmissionEntry(invalid, []);
      } catch {
        threw = true;
      }

      assert(threw, "Expected validation to reject non-total allocation");
    });

    test("Validation accepts sparse allocation object for known prize IDs", function () {
      const valid = createValidEntry({
        allocations: { p1: 20 },
        totalTickets: 20
      });

      let threw = false;
      try {
        serviceHooks.validateSubmissionEntry(valid, []);
      } catch {
        threw = true;
      }

      assert(threw === false, "Sparse allocations with known IDs should pass validation");
    });

    test("Validation rejects unknown prize IDs", function () {
      const invalid = createValidEntry({
        allocations: { p1: 20 },
        totalTickets: 20
      });
      invalid.rawAllocationKeys = ["p1", "badPrizeId"];

      let threw = false;
      try {
        serviceHooks.validateSubmissionEntry(invalid, []);
      } catch {
        threw = true;
      }

      assert(threw, "Expected validation to reject invalid prize IDs");
    });

    test("Validation rejects negative and fractional allocation values", function () {
      const negative = createValidEntry({
        allocations: { p1: -1, p2: 21, p3: 0, p4: 0, p5: 0 },
        totalTickets: 20
      });

      let negativeRejected = false;
      try {
        serviceHooks.validateSubmissionEntry(negative, []);
      } catch {
        negativeRejected = true;
      }

      assert(negativeRejected, "Negative allocation should be rejected");

      const fractional = createValidEntry({
        allocations: { p1: 10.5, p2: 9.5, p3: 0, p4: 0, p5: 0 },
        totalTickets: 20
      });

      let fractionalRejected = false;
      try {
        serviceHooks.validateSubmissionEntry(fractional, []);
      } catch {
        fractionalRejected = true;
      }

      assert(fractionalRejected, "Fractional allocation should be rejected");
    });

    test("Validation rejects duplicate submission IDs", function () {
      const duplicate = createValidEntry({
        submissionId: "dup-submission-id-1",
        allocations: { p1: 20, p2: 0, p3: 0, p4: 0, p5: 0 },
        totalTickets: 20
      });

      const existing = [
        {
          submissionId: "dup-submission-id-1"
        }
      ];

      let threw = false;
      try {
        serviceHooks.validateSubmissionEntry(duplicate, existing);
      } catch {
        threw = true;
      }

      assert(threw, "Duplicate submissionId should be rejected");
    });

    test("Standard CSV export uses one row per entered prize", function () {
      const submissions = [
        {
          mode: "pilot",
          participantId: "participant-1",
          submissionId: "s1",
          submittedAt: "2026-07-11T12:00:00.000Z",
          participantName: "Jamie T",
          firstName: "Jamie",
          lastInitial: "T",
          allocations: { p1: 4, p2: 0, p3: 1, p4: 0, p5: 0 }
        }
      ];

      const rows = appHooks.buildAdminExportRows(submissions);
      assert(rows.length === 2, "Expected rows only for prizes with tickets");
      assert(rows.some(function (row) { return row.prizeId === "p1"; }), "Expected prize p1 row");
      assert(rows.some(function (row) { return row.prizeId === "p3"; }), "Expected prize p3 row");

      const csv = appHooks.buildAdminExportCsv(submissions);
      assert(csv.includes("mode"), "CSV header missing mode");
      assert(csv.includes("participantId"), "CSV header missing participantId");
      assert(csv.includes("submissionId"), "CSV header missing submissionId");
      assert(csv.includes("prizeId"), "CSV header missing prizeId");
    });

    test("Reconstructed sparse allocations still export correctly", function () {
      const submissions = [
        {
          mode: "pilot",
          participantId: "participant-1",
          submissionId: "sparse-1",
          submittedAt: "2026-07-11T12:00:00.000Z",
          participantName: "Jamie T",
          allocations: { p1: 20 }
        }
      ];

      const standardRows = appHooks.buildAdminExportRows(submissions);
      assert(standardRows.length === 1, "Sparse allocations should export one standard row");
      assert(standardRows[0].prizeId === "p1", "Sparse export row should use p1");

      const ticketPoolRows = appHooks.buildTicketPoolRows(submissions);
      assert(ticketPoolRows.length === 20, "Sparse allocations should expand to 20 ticket pool rows");
    });

    test("Ticket pool CSV expands and restarts numbering per prize", function () {
      const submissions = [
        {
          mode: "pilot",
          participantId: "participant-1",
          submissionId: "s1",
          submittedAt: "2026-07-11T12:00:00.000Z",
          participantName: "Jamie T",
          allocations: { p1: 2, p2: 0, p3: 1, p4: 0, p5: 0 }
        },
        {
          mode: "pilot",
          participantId: "participant-2",
          submissionId: "s2",
          submittedAt: "2026-07-11T12:01:00.000Z",
          participantName: "Alex R",
          allocations: { p1: 1, p2: 0, p3: 2, p4: 0, p5: 0 }
        }
      ];

      const rows = appHooks.buildTicketPoolRows(submissions);
      assert(rows.length === 6, "Ticket pool should expand to 6 rows");

      const p1Rows = rows.filter(function (row) { return row.prizeId === "p1"; });
      const p3Rows = rows.filter(function (row) { return row.prizeId === "p3"; });
      assert(p1Rows[0].ticketNumber === 1, "Prize p1 numbering should start at 1");
      assert(p3Rows[0].ticketNumber === 1, "Prize p3 numbering should restart at 1");

      const csv = appHooks.buildTicketPoolCsv(submissions);
      assert(csv.includes("ticketNumber"), "Ticket pool CSV header missing ticketNumber");
      assert(csv.includes("participantId"), "Ticket pool CSV missing participantId");
    });

    test("Admin totals summarize submissions and ticket count", function () {
      const submissions = [
        {
          allocations: { p1: 10, p2: 5, p3: 5, p4: 0, p5: 0 }
        },
        {
          allocations: { p1: 0, p2: 0, p3: 8, p4: 2, p5: 10 }
        }
      ];

      const totals = appHooks.buildAdminDashboardSummary(submissions);
      assert(totals.totalSubmissions === 2, "total submissions should be 2");
      assert(totals.totalTickets === 40, "total tickets should be 40");
    });

    test("Duplicate-click prevention lock blocks second submission attempt", function () {
      appHooks.finishSubmissionAttempt();
      const first = appHooks.beginSubmissionAttempt();
      const second = appHooks.beginSubmissionAttempt();
      appHooks.finishSubmissionAttempt();

      assert(first === true, "First submission attempt should acquire lock");
      assert(second === false, "Second submission attempt should be blocked while locked");
      assert(appHooks.getIsSubmitting() === false, "Submission lock should release after finish");
    });

    test("Repeat-submission blocking lock and participant browser reset helpers work", function () {
      appHooks.clearParticipantCompletionLock();
      assert(appHooks.hasParticipantCompletionLock() === false, "Completion lock should start clear");

      appHooks.setParticipantCompletionLock({
        participantId: "participant-1",
        participantName: "Jamie T",
        submissionId: "s1",
        submittedAt: "2026-07-11T12:00:00.000Z"
      });

      assert(appHooks.hasParticipantCompletionLock() === true, "Completion lock should be set");

      appHooks.clearParticipantCompletionLock();
      const newId = storageHooks.resetParticipantId();
      assert(Boolean(newId), "Reset should generate a new participant ID");
      assert(appHooks.hasParticipantCompletionLock() === false, "Completion lock should be cleared after reset");
    });

    test("Clear-all-data confirmation requires two approvals", function () {
      const callsA = [];
      const blocked = appHooks.confirmClearAllPilotData(function (message) {
        callsA.push(message);
        return false;
      });
      assert(blocked === false, "First rejection should block clear-all");
      assert(callsA.length === 1, "Should stop after first confirmation rejection");

      const callsB = [];
      const blockedSecond = appHooks.confirmClearAllPilotData(function (message) {
        callsB.push(message);
        return callsB.length === 1;
      });
      assert(blockedSecond === false, "Second rejection should block clear-all");
      assert(callsB.length === 2, "Should require two confirmations");
    });

    lines.push("");
    lines.push("Note: Database transaction rollback behavior is verified with server/API checks after migration.");
    lines.push("");
    lines.push(`Result: ${passed} passed, ${failed} failed`);

    return {
      passed,
      failed,
      output: lines.join("\n")
    };
  }

  function renderTestResults() {
    const outputEl = document.getElementById("test-output");
    const result = runTests();
    outputEl.textContent = result.output;

    if (result.failed > 0) {
      outputEl.style.color = "#f76d6d";
      return;
    }

    outputEl.style.color = "#82de8e";
  }

  document.getElementById("run-tests-btn").addEventListener("click", renderTestResults);
})();
