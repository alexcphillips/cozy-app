export class GameLoop {
    // Timestamp (in milliseconds) of the last simulation tick.
    // Used to calculate how much real time has passed.
    private lastTick = Date.now();

    start() {
        // Runs the simulation loop ~20 times per second (every 50ms).
        setInterval(() => {
            this.tick();
        }, 50);
    }

    private tick() {
        // 1. CURRENT REAL-WORLD TIME (ms since epoch)
        // -------------------------------------------
        // This is just the server clock at this moment.
        const now = Date.now();

        // 2. REAL TIME PASSED SINCE LAST TICK (ms)
        // ----------------------------------------
        // How much actual time passed in the real world.
        // This is NOT game time yet.
        const deltaMs = now - this.lastTick;

        // Update baseline for next tick calculation
        this.lastTick = now;

        // 3. TARGET SIMULATION SPEED (design constant)
        // --------------------------------------------
        // We want the simulation to behave like:
        // 20 updates ("ticks") per second.
        const tickRate = 20;

        // 4. HOW LONG ONE GAME TICK REPRESENTS IN REAL TIME (ms)
        // ------------------------------------------------------
        // 1000ms / 20 = 50ms per simulation tick
        //
        // Meaning:
        // 1 tick = 50ms of simulated time
        const tickLengthMs = 1000 / tickRate;

        // 5. CONVERT REAL TIME → SIMULATION TIME
        // --------------------------------------
        // This tells us how many "game ticks worth of time"
        // passed since last update.
        //
        // Example:
        // deltaMs = 100ms
        // tickLengthMs = 50ms
        // timeStep = 2.0 ticks
        //
        // So the simulation should advance by 2 ticks.
        const timeStep = deltaMs / tickLengthMs;

        // IMPORTANT NOTE:
        // timeStep is NOT "frames" or "loops".
        // It is "how much simulation time passed".
        //
        // It may be:
        // - 0.5 (slow update, partial tick)
        // - 1.0 (normal tick)
        // - 2.4 (lag spike → simulate multiple ticks worth of time)

        // 6. ADVANCE SIMULATION STATE
        // ---------------------------
        // runManager.tickRuns(timeStep);
        // -> fishing tension, AI fish behavior, buffs ticking, etc.

        // 7. PROCESS GAME ACTIONS
        // ----------------------
        // actionProcessor.process(timeStep);
        // -> resolves queued actions (player + system generated)

        // 8. EMIT SIDE EFFECT EVENTS
        // -------------------------
        // eventBus.resolve();
        // -> triggers effects, quests, achievements, etc.

        // 9. SYNC STATE TO CLIENTS
        // ------------------------
        // websocketManager.broadcastUpdates();
    }
}
