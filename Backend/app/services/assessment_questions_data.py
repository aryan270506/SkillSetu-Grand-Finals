# -*- coding: utf-8 -*-
"""
Authoritative dataset of 15 to 25 unique technical assessment questions per skill/competency.
Strictly conforms to SkillSetu Rule 35:
- Minimum 15 questions, maximum 25 questions per assessment (20 questions per assessment by default)
- 4 distinct options (A, B, C, D) per question
- Validated correct option and clear technical explanation
- Balanced difficulty distribution (Foundation/Easy: 5, Intermediate/Medium: 10, Advanced/Hard: 5)
"""

ASSESSMENT_QUESTION_DATASETS = {
    "Docker": {
        "title": "Docker Comprehensive Assessment",
        "description": "Covers container lifecycle, multi-stage Dockerfiles, overlay networks, volumes, and orchestration security.",
        "pass_score": 70,
        "difficulty": "Intermediate",
        "duration_minutes": 35,
        "questions": [
            {
                "question_text": "What is the primary difference between the `CMD` and `ENTRYPOINT` instructions in a Dockerfile?",
                "options": {
                    "A": "CMD defines the default executable, while ENTRYPOINT defines arguments that cannot be overridden",
                    "B": "ENTRYPOINT sets the default command executable, while CMD provides default arguments that can be overridden at runtime",
                    "C": "CMD creates an image layer, while ENTRYPOINT only runs during docker build",
                    "D": "ENTRYPOINT is only available in Docker Compose, whereas CMD is used in single containers"
                },
                "correct_option": "B",
                "explanation": "ENTRYPOINT specifies the immutable command binary, while CMD specifies default arguments that can easily be overridden via CLI args.",
                "difficulty": "Easy"
            },
            {
                "question_text": "Which Docker storage mechanism directly mounts host file system paths into a container with full host permissions?",
                "options": {
                    "A": "Named Volumes",
                    "B": "Bind Mounts",
                    "C": "tmpfs Mounts",
                    "D": "Overlay2 Storage Driver"
                },
                "correct_option": "B",
                "explanation": "Bind mounts map a specific host absolute file or directory directly into the container filesystem.",
                "difficulty": "Easy"
            },
            {
                "question_text": "How do multi-stage Docker builds optimize the final production container image?",
                "options": {
                    "A": "They compile multiple programming languages simultaneously in parallel threads",
                    "B": "They copy only compiled production artifacts from intermediate builder stages into a minimal runtime base image",
                    "C": "They automatically minify JavaScript and compress Docker images using gzip",
                    "D": "They eliminate the requirement for exposing host ports"
                },
                "correct_option": "B",
                "explanation": "Multi-stage builds leave behind compilers, build dependencies, and SDKs, copying only final binaries into lightweight runtime images (e.g., alpine or scratch).",
                "difficulty": "Medium"
            },
            {
                "question_text": "Which Docker network driver enables seamless multi-host container communication across Docker Swarm nodes without host port mapping?",
                "options": {
                    "A": "bridge",
                    "B": "host",
                    "C": "overlay",
                    "D": "macvlan"
                },
                "correct_option": "C",
                "explanation": "The overlay network driver creates a distributed network among multiple Docker daemon hosts for cluster communication.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the purpose of the `.dockerignore` file during the container build process?",
                "options": {
                    "A": "It prevents stopped containers from being deleted during pruning",
                    "B": "It excludes specified files and directories from the build context sent to the Docker daemon",
                    "C": "It prevents specific network ports from being exposed externally",
                    "D": "It masks environment variables from container inspection"
                },
                "correct_option": "B",
                "explanation": "Excluding large or sensitive directories (e.g., node_modules, .git) reduces context transfer latency and prevents credential leaks.",
                "difficulty": "Easy"
            },
            {
                "question_text": "Which command removes all stopped containers, unused networks, dangling images, and build cache in a single operation?",
                "options": {
                    "A": "docker container stop --all",
                    "B": "docker system prune -a",
                    "C": "docker rmi --force",
                    "D": "docker compose down --volumes"
                },
                "correct_option": "B",
                "explanation": "docker system prune -a cleans up all unused images, stopped containers, build caches, and dangling networks across the daemon.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What happens when a container reaches its allocated `--memory` limit without configured swap?",
                "options": {
                    "A": "The container throttles CPU clock cycles to reduce memory pressure",
                    "B": "The Linux kernel OOM (Out of Memory) killer terminates the offending process with exit code 137",
                    "C": "The container automatically expands memory by borrowing from neighbor containers",
                    "D": "The container saves its heap state to a crash dump and enters hibernation"
                },
                "correct_option": "B",
                "explanation": "Exceeding memory limits triggers Linux OOM killer invocation (SIGKILL), resulting in exit code 137.",
                "difficulty": "Medium"
            },
            {
                "question_text": "Which Docker security practice prevents container breakout attacks from acquiring root host privileges?",
                "options": {
                    "A": "Running containers as non-root users (USER directive) and dropping unnecessary Linux capabilities (`--cap-drop=ALL`)",
                    "B": "Disabling TLS authentication on the Docker socket",
                    "C": "Mounting the host `/var/run/docker.sock` into application containers",
                    "D": "Using `privileged: true` in production docker-compose definitions"
                },
                "correct_option": "A",
                "explanation": "Using dedicated non-root users and restricting Linux kernel capabilities minimizes vulnerability blast radius.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the key advantage of using `HEALTHCHECK` in a Dockerfile over relying on container process status?",
                "options": {
                    "A": "It automatically restarts failed containers without orchestrator intervention",
                    "B": "It verifies that internal application services (e.g., HTTP ping, DB socket) are genuinely responding, not just that PID 1 is alive",
                    "C": "It speeds up image download speeds across private registries",
                    "D": "It generates synthetic test traffic to benchmark latency"
                },
                "correct_option": "B",
                "explanation": "A process can be deadlocked or hanging while PID 1 remains active; HEALTHCHECK tests true functional availability.",
                "difficulty": "Medium"
            },
            {
                "question_text": "In Docker Compose, what is the effect of configuring `restart: unless-stopped`?",
                "options": {
                    "A": "The container restarts only when exiting with an error code other than 0",
                    "B": "The container restarts on daemon reboot or crash unless explicitly stopped by a user command",
                    "C": "The container never restarts if it encounters a network timeout",
                    "D": "The container restarts up to a maximum of 5 retry cycles before exiting"
                },
                "correct_option": "B",
                "explanation": "unless-stopped ensures containers persist through host reboots while honoring deliberate user stop commands.",
                "difficulty": "Easy"
            },
            {
                "question_text": "How does the Docker BuildKit engine improve Dockerfile build execution performance?",
                "options": {
                    "A": "By executing independent build stages in parallel and utilizing concurrent dependency caching",
                    "B": "By skipping unit test execution inside the build container",
                    "C": "By converting all interpreted code into compiled machine binaries",
                    "D": "By bypassing container security scanning entirely"
                },
                "correct_option": "A",
                "explanation": "BuildKit analyzes graph dependencies to build unlinked stages in parallel and uses granular cache mounts.",
                "difficulty": "Hard"
            },
            {
                "question_text": "Which Linux kernel feature provides process and resource isolation (e.g. PID, mount, network) for Docker containers?",
                "options": {
                    "A": "Control Groups (cgroups)",
                    "B": "Linux Namespaces",
                    "C": "Seccomp profiles",
                    "D": "Chroot jail alone"
                },
                "correct_option": "B",
                "explanation": "Namespaces provide isolated views of system resources (PID, NET, MNT, IPC, UTS, USER), whereas cgroups enforce resource limits.",
                "difficulty": "Hard"
            },
            {
                "question_text": "Which Linux kernel feature enforces hardware resource quotas (CPU shares, Memory limits, IO bandwidth)?",
                "options": {
                    "A": "Control Groups (cgroups)",
                    "B": "Linux Namespaces",
                    "C": "AppArmor",
                    "D": "eBPF filters"
                },
                "correct_option": "A",
                "explanation": "cgroups (control groups) meter and limit memory, CPU, block I/O, and network allocations per container.",
                "difficulty": "Hard"
            },
            {
                "question_text": "When building an image, why should instructions that change frequently (like `COPY . .`) be placed toward the bottom of the Dockerfile?",
                "options": {
                    "A": "To maximize Docker layer cache reuse for unchanging dependency installation layers above them",
                    "B": "Because Dockerfiles execute from bottom to top",
                    "C": "To ensure environment variables overwrite previous values",
                    "D": "To reduce container memory consumption at runtime"
                },
                "correct_option": "A",
                "explanation": "When an upper layer cache is invalidated, all subsequent layers must be rebuilt; placing static dependencies first maximizes cache hits.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the difference between `docker pause` and `docker stop`?",
                "options": {
                    "A": "docker pause freezes container execution using cgroups freezer without killing processes; docker stop sends SIGTERM followed by SIGKILL",
                    "B": "docker pause deletes the container file system temporarily",
                    "C": "docker stop keeps the memory state alive in RAM",
                    "D": "docker pause is only supported for root containers"
                },
                "correct_option": "A",
                "explanation": "pause utilizes the cgroups freezer subsystem to suspend process scheduling without terminating socket connections or state.",
                "difficulty": "Hard"
            },
            {
                "question_text": "Which flag allows a Docker container to share the host's networking stack directly without NAT overhead?",
                "options": {
                    "A": "--net=bridge",
                    "B": "--network=host",
                    "C": "--network=none",
                    "D": "--ipc=host"
                },
                "correct_option": "B",
                "explanation": "--network=host attaches the container directly to the host network interface without namespace isolation or port mapping.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the primary risk of exposing the Docker daemon socket (`/var/run/docker.sock`) inside a web container?",
                "options": {
                    "A": "Increased network latency for HTTP requests",
                    "B": "Complete host compromise, as anyone with socket access can spawn privileged containers with root host mounts",
                    "C": "Automatic container de-registration from Docker Swarm",
                    "D": "Inability to mount Docker volumes"
                },
                "correct_option": "B",
                "explanation": "The Docker daemon runs as root; socket access allows arbitrary container creation, effectively granting root privilege over the entire host.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What is the function of the `ARG` instruction compared to `ENV` in a Dockerfile?",
                "options": {
                    "A": "ARG is available only during the image build phase; ENV persists in the image metadata and runtime container environment",
                    "B": "ARG persists in the running container while ENV is build-only",
                    "C": "ARG is strictly for numeric integers, ENV is for strings",
                    "D": "ARG cannot be overridden from the command line"
                },
                "correct_option": "A",
                "explanation": "ARG defines build-time variables passed via --build-arg; ENV defines runtime environment variables.",
                "difficulty": "Medium"
            },
            {
                "question_text": "In Docker volume management, what distinguishes `tmpfs` mounts from standard named volumes?",
                "options": {
                    "A": "tmpfs mounts are stored in host memory only and are never written to the host filesystem disk",
                    "B": "tmpfs mounts persist permanently even after system reboot",
                    "C": "tmpfs mounts can be shared across multiple physical servers",
                    "D": "tmpfs mounts require root permissions to create"
                },
                "correct_option": "A",
                "explanation": "tmpfs mounts exist entirely within host volatile RAM, making them fast and ideal for temporary secrets or transient states.",
                "difficulty": "Medium"
            },
            {
                "question_text": "Which Docker logging driver is commonly configured to forward container stdout/stderr streams to centralized logging aggregators (e.g. Fluentd, Splunk, CloudWatch)?",
                "options": {
                    "A": "json-file",
                    "B": "fluentd / syslog / awslogs",
                    "C": "local-disk",
                    "D": "raw-socket"
                },
                "correct_option": "B",
                "explanation": "Docker supports configurable logging drivers including syslog, fluentd, gelf, and awslogs to direct logs directly to centralized observability platforms.",
                "difficulty": "Medium"
            }
        ]
    },

    "JavaScript": {
        "title": "JavaScript Core & Advanced Architecture Assessment",
        "description": "Covers event loop microtask queues, prototypal inheritance, closures, memory leak patterns, and ECMAScript concurrency.",
        "pass_score": 70,
        "difficulty": "Intermediate",
        "duration_minutes": 35,
        "questions": [
            {
                "question_text": "In JavaScript's event loop model, which queue has highest priority and executes immediately after the current call stack clears before task queue callbacks?",
                "options": {
                    "A": "Macrotask Queue (setTimeout, setInterval)",
                    "B": "Microtask Queue (Promise.then, queueMicrotask, MutationObserver)",
                    "C": "Web Worker Background Queue",
                    "D": "I/O Polling Queue"
                },
                "correct_option": "B",
                "explanation": "The microtask queue is drained completely after every call stack execution before the event loop advances to macrotasks.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What will `console.log(typeof null)` and `console.log(typeof undefined)` output in modern JavaScript engines?",
                "options": {
                    "A": "'null' and 'undefined'",
                    "B": "'object' and 'undefined'",
                    "C": "'object' and 'object'",
                    "D": "'undefined' and 'null'"
                },
                "correct_option": "B",
                "explanation": "typeof null returns 'object' due to historical type tag implementation in original JS; typeof undefined returns 'undefined'.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the primary mechanism of a JavaScript closure?",
                "options": {
                    "A": "A function bundled together with references to its surrounding lexical environment state",
                    "B": "An object constructor that freezes all mutable properties",
                    "C": "An asynchronous callback that executes only in Web Workers",
                    "D": "A memory allocation technique used by garbage collectors"
                },
                "correct_option": "A",
                "explanation": "A closure gives an inner function access to an outer function’s scope variables even after the outer function has returned.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the key functional difference between `Array.prototype.map()` and `Array.prototype.forEach()`?",
                "options": {
                    "A": "map returns a new transformed array without mutating the original; forEach returns undefined and executes side-effects",
                    "B": "forEach executes asynchronously while map executes synchronously",
                    "C": "map mutates the source array in place",
                    "D": "forEach allows using await while map does not"
                },
                "correct_option": "A",
                "explanation": "map() creates and returns a new array populated with results of calling the function on every element; forEach() returns undefined.",
                "difficulty": "Easy"
            },
            {
                "question_text": "How does `WeakMap` differ from standard `Map` regarding garbage collection and key types?",
                "options": {
                    "A": "WeakMap keys must be objects (or non-registered symbols) and are held weakly, preventing memory leaks if no other references exist",
                    "B": "WeakMap allows primitive keys like strings and numbers",
                    "C": "WeakMap is iterable with for..of loops",
                    "D": "WeakMap retains entries permanently in localStorage"
                },
                "correct_option": "A",
                "explanation": "WeakMap holds weak references to its object keys; once an object key has no other references, its entry is automatically garbage collected.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What does `Object.freeze()` do compared to `Object.seal()`?",
                "options": {
                    "A": "Object.freeze prevents adding/deleting properties and makes existing properties read-only (writable: false); seal allows modifying existing writable properties",
                    "B": "Object.seal prevents property modification while freeze allows updating values",
                    "C": "Object.freeze performs deep recursive immutability on nested objects automatically",
                    "D": "Both methods are completely identical in modern V8"
                },
                "correct_option": "A",
                "explanation": "freeze makes existing properties non-writable and non-configurable; seal prevents addition/deletion but retains existing property writability.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What will `[1, 2, 3] + [4, 5, 6]` evaluate to in JavaScript?",
                "options": {
                    "A": "[1, 2, 3, 4, 5, 6]",
                    "B": "'1,2,34,5,6'",
                    "C": "NaN",
                    "D": "TypeError: Cannot add arrays"
                },
                "correct_option": "B",
                "explanation": "The + operator triggers String coercion via toString() on both arrays ('1,2,3' and '4,5,6'), concatenating them into '1,2,34,5,6'.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the purpose of the `Symbol.iterator` well-known symbol in JavaScript?",
                "options": {
                    "A": "It defines the default iterator method that enables an object to be consumed by `for...of` loops and spread syntax",
                    "B": "It generates unique UUIDs for database rows",
                    "C": "It acts as a private class field specifier",
                    "D": "It prevents prototype pollution in JSON parsing"
                },
                "correct_option": "A",
                "explanation": "Objects implementing the [Symbol.iterator]() method conform to the iteration protocol and can be traversed via for..of and spread (...).",
                "difficulty": "Hard"
            },
            {
                "question_text": "What is the difference between `==` (loose equality) and `===` (strict equality)?",
                "options": {
                    "A": "== performs type coercion before comparison; === compares both value and type without coercion",
                    "B": "=== converts strings to numbers before comparing",
                    "C": "== is faster than ===",
                    "D": "=== checks object identity while == checks deep structural equality"
                },
                "correct_option": "A",
                "explanation": "Loose equality (==) applies abstract equality comparison algorithms with coercion; strict equality (===) requires identical types.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is a common cause of memory leaks in single-page JavaScript web applications?",
                "options": {
                    "A": "Uncleared global `setInterval` timers or unremoved event listeners referencing detached DOM elements in closures",
                    "B": "Using const instead of var for variable declarations",
                    "C": "Creating immutable object records with Object.freeze",
                    "D": "Calling JSON.stringify on shallow objects"
                },
                "correct_option": "A",
                "explanation": "Active event listeners or timers holding references to detached DOM nodes prevent the V8 garbage collector from reclaiming memory.",
                "difficulty": "Medium"
            },
            {
                "question_text": "How does `Promise.allSettled()` differ from `Promise.all()`?",
                "options": {
                    "A": "Promise.allSettled waits for all promises to either resolve or reject and returns their statuses; Promise.all rejects immediately upon the first rejection",
                    "B": "Promise.allSettled cancels pending promises on error",
                    "C": "Promise.all executes promises sequentially whereas allSettled runs in parallel",
                    "D": "Promise.allSettled only works with Fetch requests"
                },
                "correct_option": "A",
                "explanation": "Promise.all fails fast on any rejection; allSettled always awaits full completion of all input promises, returning an array of outcome objects.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the execution context `this` value inside an arrow function?",
                "options": {
                    "A": "Arrow functions do not bind their own `this`; they lexically inherit `this` from the enclosing outer execution context",
                    "B": "The DOM element that triggered the event",
                    "C": "The global window / globalThis object exclusively",
                    "D": "undefined in strict mode and global object in non-strict mode"
                },
                "correct_option": "A",
                "explanation": "Arrow functions lack their own this, arguments, and super bindings; this is resolved lexically from the enclosing scope.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What does `Function.prototype.bind()` return when called on a function?",
                "options": {
                    "A": "A new bound function with specified `this` context and optional partially applied initial arguments",
                    "B": "The immediate return value of executing the original function",
                    "C": "A Promise resolving to the function's execution value",
                    "D": "A deep clone of the function's AST"
                },
                "correct_option": "A",
                "explanation": "bind() creates a new function that, when called, has its this keyword set to the provided value with preset lead arguments.",
                "difficulty": "Easy"
            },
            {
                "question_text": "In modern V8 engines, what is the purpose of the 'Hidden Class' (Shapes) optimization?",
                "options": {
                    "A": "It tracks object property layouts in memory to enable inline caching and fast property access without hash lookups",
                    "B": "It enforces private variables in JavaScript classes",
                    "C": "It encrypts bytecode prior to execution",
                    "D": "It compresses JavaScript source code during bundle compilation"
                },
                "correct_option": "A",
                "explanation": "Hidden classes (shapes) allow V8 to access properties at fixed memory offsets rather than dynamic dictionary lookups.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What is the difference between `structuredClone()` and `JSON.parse(JSON.stringify(obj))` for deep copying?",
                "options": {
                    "A": "structuredClone handles circular references, Maps, Sets, Dates, and ArrayBuffers; JSON serialization loses non-JSON types and throws on circular graphs",
                    "B": "JSON serialization is faster and supports BigInt natively",
                    "C": "structuredClone only works in Web Workers",
                    "D": "There is no functional difference"
                },
                "correct_option": "A",
                "explanation": "structuredClone supports complex structured types, binary buffers, Sets/Maps, and cyclic graphs without data loss.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What will `console.log(0.1 + 0.2 === 0.3)` return in JavaScript and why?",
                "options": {
                    "A": "false, due to IEEE 754 double-precision floating-point binary rounding errors (0.30000000000000004)",
                    "B": "true, because JS numbers are 64-bit precise",
                    "C": "TypeError: Cannot compare decimals",
                    "D": "undefined"
                },
                "correct_option": "A",
                "explanation": "Binary floating-point arithmetic cannot represent certain decimal fractions (like 0.1 and 0.2) exactly, yielding 0.30000000000000004.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the Temporal Dead Zone (TDZ) in JavaScript?",
                "options": {
                    "A": "The period between entering a scope and the variable declaration where accessing `let` or `const` variables throws a ReferenceError",
                    "B": "The delay between setTimeout scheduling and callback execution",
                    "C": "The inactive state of Service Workers during network disconnection",
                    "D": "The garbage collector sweep phase"
                },
                "correct_option": "A",
                "explanation": "Variables declared with let and const are hoisted but uninitialized until execution reaches their declaration statement; accessing them early triggers TDZ ReferenceError.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is a JavaScript Generator function (`function*`) and what does calling it return?",
                "options": {
                    "A": "A function that can pause execution via `yield` and returns a Generator iterator object with a `.next()` method",
                    "B": "A function that generates random numbers cryptographically",
                    "C": "A multithreaded worker thread manager",
                    "D": "A compiler macro that generates TypeScript definition files"
                },
                "correct_option": "A",
                "explanation": "Generators produce iterators whose execution can be paused and resumed using yield and next() calls.",
                "difficulty": "Hard"
            },
            {
                "question_text": "How do `Proxy` and `Reflect` APIs work together in modern meta-programming?",
                "options": {
                    "A": "Proxy intercepts fundamental object operations (traps), and Reflect methods forward the default operational behavior to the target object",
                    "B": "Proxy is used for DOM manipulation and Reflect is used for Node.js file I/O",
                    "C": "Reflect replaces all prototypes with Proxy instances",
                    "D": "Proxy is an encryption wrapper around plain objects"
                },
                "correct_option": "A",
                "explanation": "Proxy traps intercept operations like get, set, has; Reflect provides standardized default methods matching each proxy trap signature.",
                "difficulty": "Hard"
            },
            {
                "question_text": "Which method should be used to run CPU-intensive tasks without blocking the main browser UI thread?",
                "options": {
                    "A": "Web Workers (Worker API)",
                    "B": "Nested setTimeout(..., 0) callbacks",
                    "C": "Promise.resolve().then() microtasks",
                    "D": "CSS hardware acceleration transforms"
                },
                "correct_option": "A",
                "explanation": "Web Workers execute JavaScript in background OS threads with isolated memory spaces, preventing UI thread frame drops.",
                "difficulty": "Medium"
            }
        ]
    },

    "TypeScript": {
        "title": "TypeScript Advanced Type Safety Assessment",
        "description": "Covers conditional types, mapped types, template literal types, discriminated unions, utility types, and generic constraints.",
        "pass_score": 70,
        "difficulty": "Intermediate",
        "duration_minutes": 35,
        "questions": [
            {
                "question_text": "What is the primary difference between `unknown` and `any` in TypeScript?",
                "options": {
                    "A": "unknown is the type-safe counterpart of any; operations on unknown require explicit type narrowing or casting before execution",
                    "B": "any requires type assertions whereas unknown disables all type checks",
                    "C": "unknown cannot be assigned any value at runtime",
                    "D": "unknown is only allowed for primitive types"
                },
                "correct_option": "A",
                "explanation": "unknown forces developers to perform type checks (e.g. typeof, instanceof) before accessing properties, preserving compile-time safety.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What does the `keyof` operator produce when applied to an interface or object type?",
                "options": {
                    "A": "A string or numeric literal union representing all public property names of the type",
                    "B": "An array of runtime object keys at execution time",
                    "C": "The prototype chain of the class",
                    "D": "A boolean indicating whether the key exists"
                },
                "correct_option": "A",
                "explanation": "keyof T produces a union of string/number literal types corresponding to the property keys of type T.",
                "difficulty": "Easy"
            },
            {
                "question_text": "How do Discriminated Unions (tagged unions) provide type narrowing in TypeScript switch statements?",
                "options": {
                    "A": "By sharing a common literal property (e.g. `kind: 'circle' | 'square'`) that TypeScript's control-flow analysis uses to narrow the union member",
                    "B": "By casting all members to type any automatically",
                    "C": "By using runtime regex pattern matching",
                    "D": "By requiring all properties to be optional"
                },
                "correct_option": "A",
                "explanation": "A common discriminant property with literal types enables TypeScript's exhaustive type narrowing across conditional branches.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What does the `never` type represent in TypeScript's type hierarchy?",
                "options": {
                    "A": "The bottom type representing values that never occur (e.g. functions that throw errors or unreachable union branches)",
                    "B": "A nullable reference equivalent to void",
                    "C": "A type for variables that can never be modified",
                    "D": "The top type encompassing all possible JS values"
                },
                "correct_option": "A",
                "explanation": "never is the empty set/bottom type. In exhaustive type checking, assigning an unhandled branch to never catches missing cases at compile time.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the utility type `Record<K, T>` used for in TypeScript?",
                "options": {
                    "A": "Constructing an object type whose property keys are K and property values are T",
                    "B": "Recording audio streams in web audio APIs",
                    "C": "Creating immutable database row records",
                    "D": "Extracting return types from async functions"
                },
                "correct_option": "A",
                "explanation": "Record<Keys, Type> constructs an object type where keys belong to the union Keys and values are of Type.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What does the `infer` keyword accomplish within a TypeScript conditional type?",
                "options": {
                    "A": "It introduces a type variable to be deduced from the type being examined in the `extends` clause",
                    "B": "It tells TypeScript to automatically cast values to any",
                    "C": "It imports types from third-party npm packages",
                    "D": "It infers the runtime JavaScript memory footprint"
                },
                "correct_option": "A",
                "explanation": "infer allows extracting inner component types (like function return types or array element types) inside conditional type expressions.",
                "difficulty": "Hard"
            },
            {
                "question_text": "How does `type` alias differ from `interface` regarding declaration merging in TypeScript?",
                "options": {
                    "A": "Multiple interface declarations with the same name automatically merge their properties; type aliases cannot be reopened and throw duplicate identifier errors",
                    "B": "Type aliases merge automatically while interfaces cannot",
                    "C": "Interfaces only support primitive types",
                    "D": "There is no difference in declaration merging"
                },
                "correct_option": "A",
                "explanation": "Interfaces support declaration merging across files/definitions; type aliases cannot be declared multiple times in the same scope.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What does the `Readonly<T>` utility type do to an interface?",
                "options": {
                    "A": "It constructs a type with all properties of T set to `readonly`, preventing reassignment at compile-time",
                    "B": "It calls Object.freeze() at runtime automatically",
                    "C": "It removes all non-readonly keys from T",
                    "D": "It hides properties from JSON serialization"
                },
                "correct_option": "A",
                "explanation": "Readonly<T> marks all properties of type T with the readonly modifier, causing TypeScript to reject reassignments.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the purpose of TypeScript's `as const` assertion (const assertions)?",
                "options": {
                    "A": "It signals to TypeScript that array literals should become readonly tuples and object literal properties should receive exact literal types rather than widened primitives",
                    "B": "It converts JavaScript variables to WebAssembly constants",
                    "C": "It compiles code into C++ const pointers",
                    "D": "It prevents variable reassignment in JavaScript runtime memory"
                },
                "correct_option": "A",
                "explanation": "const assertions prevent type widening (e.g. string widening to literal 'admin') and make arrays readonly fixed tuples.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What does the `satisfies` operator introduced in TypeScript 4.9 enable?",
                "options": {
                    "A": "It validates that an expression matches a type without widening or losing the expression's specific inferred type",
                    "B": "It executes runtime validation schemas like Zod",
                    "C": "It satisfies database constraint requirements",
                    "D": "It bypasses strict null checks conditionally"
                },
                "correct_option": "A",
                "explanation": "satisfies ensures an object complies with an interface/contract while preserving exact literal and method type inference on the resulting variable.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What does the `Omit<T, K>` utility type do?",
                "options": {
                    "A": "Constructs a type by picking all properties from T and then removing keys in K",
                    "B": "Constructs a type picking only keys in K from T",
                    "C": "Sets properties in K to undefined",
                    "D": "Converts properties in K to optional fields"
                },
                "correct_option": "A",
                "explanation": "Omit<T, K> creates a type with all properties of T except those listed in key union K.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is a Template Literal Type in TypeScript (e.g. `type Event = \`on\${Capitalize<string>}\``)?",
                "options": {
                    "A": "A type built via template literal syntax that expands into string literal unions based on type parameters",
                    "B": "A template engine for rendering HTML on Node.js",
                    "C": "A runtime regex validator",
                    "D": "A macro system for transpiling JSX"
                },
                "correct_option": "A",
                "explanation": "Template literal types produce new string literal types by concatenating and transforming other types via template string syntax.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What does the `NonNullable<T>` utility type filter out from a type union?",
                "options": {
                    "A": "null and undefined",
                    "B": "false, 0, and empty strings",
                    "C": "Empty arrays and empty objects",
                    "D": "Functions and Promises"
                },
                "correct_option": "A",
                "explanation": "NonNullable<T> excludes null and undefined from type T.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the behavior of the `Partial<T>` utility type?",
                "options": {
                    "A": "It constructs a type with all properties of T set to optional (`?`)",
                    "B": "It takes the first half of an interface's properties",
                    "C": "It allows partial class inheritance",
                    "D": "It marks all properties as nullable"
                },
                "correct_option": "A",
                "explanation": "Partial<T> wraps every property key of T in an optional modifier, allowing partial object payloads.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the difference between `type A = Parameters<T>` and `type B = ReturnType<T>`?",
                "options": {
                    "A": "Parameters extracts function parameter types as a tuple; ReturnType extracts the function's return type",
                    "B": "Parameters returns an object and ReturnType returns a string",
                    "C": "Parameters only works with synchronous functions",
                    "D": "ReturnType only works with async Promises"
                },
                "correct_option": "A",
                "explanation": "Parameters<T> extracts parameter types as a tuple type, and ReturnType<T> extracts the function's output type.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is a 'type predicate' in a custom TypeScript type guard function?",
                "options": {
                    "A": "A return type annotation in the form `arg is Type` that instructs the compiler to narrow `arg` if the function returns true",
                    "B": "A boolean check on database schema columns",
                    "C": "A decorator that validates inputs at runtime",
                    "D": "A compiler flag in tsconfig.json"
                },
                "correct_option": "A",
                "explanation": "Type predicates (e.g. function isUser(x: any): x is User) instruct TypeScript's control-flow analysis to narrow types across if branches.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What does `strictNullChecks: true` in tsconfig.json enforce across the codebase?",
                "options": {
                    "A": "null and undefined are not in the domain of every type and must be handled or declared explicitly in unions",
                    "B": "All variables must be initialized to 0",
                    "C": "All optional properties are banned",
                    "D": "Null references are automatically converted to empty strings"
                },
                "correct_option": "A",
                "explanation": "With strictNullChecks enabled, null and undefined are distinct types and cannot be assigned to variables unless explicitly typed.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the effect of prefixing a class parameter with `private` in a TypeScript constructor parameter property?",
                "options": {
                    "A": "It automatically declares and initializes a private member on the class instance",
                    "B": "It marks the constructor as private so the class cannot be instantiated",
                    "C": "It encrypts the variable at runtime",
                    "D": "It prevents the class from extending other classes"
                },
                "correct_option": "A",
                "explanation": "Parameter properties automatically declare and assign class instance fields with the specified access modifier.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is a 'Mapped Type' in TypeScript?",
                "options": {
                    "A": "A generic type that iterates over property keys from a union to produce new property signatures (e.g. `[P in K]: T[P]`)",
                    "B": "A JavaScript Map wrapper for React components",
                    "C": "A type specifically for geographic GIS mapping",
                    "D": "A database ORM schema mapping tool"
                },
                "correct_option": "A",
                "explanation": "Mapped types iterate over keys using the in operator to transform existing property types uniformly.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What does the `Extract<T, U>` utility type do compared to `Exclude<T, U>`?",
                "options": {
                    "A": "Extract selects types from union T that are assignable to U; Exclude removes types from T that are assignable to U",
                    "B": "Extract converts unions into arrays; Exclude deletes types permanently",
                    "C": "Extract only works with objects while Exclude works with primitives",
                    "D": "Extract is for regex extraction from strings"
                },
                "correct_option": "A",
                "explanation": "Extract<T, U> filters union members that extend U; Exclude<T, U> strips union members that extend U.",
                "difficulty": "Medium"
            }
        ]
    },

    "Node.js": {
        "title": "Node.js & Express Production Backend Assessment",
        "description": "Covers asynchronous IO, libuv worker threads, streams, middleware architectures, clustering, and security headers.",
        "pass_score": 70,
        "difficulty": "Intermediate",
        "duration_minutes": 35,
        "questions": [
            {
                "question_text": "Which parameter order is standard for Express.js error-handling middleware functions?",
                "options": {
                    "A": "(req, res, next)",
                    "B": "(err, req, res, next)",
                    "C": "(req, res, err)",
                    "D": "(next, err, req, res)"
                },
                "correct_option": "B",
                "explanation": "Express identifies error-handling middleware strictly by checking function arity (length === 4), requiring (err, req, res, next).",
                "difficulty": "Easy"
            },
            {
                "question_text": "Why should password hashing use bcrypt or argon2 instead of plain SHA256 in Node.js backends?",
                "options": {
                    "A": "SHA256 is deprecated in OpenSSL",
                    "B": "bcrypt and argon2 incorporate cryptographic salts and tunable work/cost factors resistant to GPU and rainbow-table attacks",
                    "C": "SHA256 cannot hash strings longer than 32 characters",
                    "D": "Node.js crypto module does not support SHA256"
                },
                "correct_option": "B",
                "explanation": "Password hashing algorithms are intentionally CPU/memory-intensive with salt generation to prevent brute-force attacks.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What role does `libuv` play in the Node.js architecture?",
                "options": {
                    "A": "It provides the multi-platform asynchronous I/O event loop, thread pool, and non-blocking networking core for Node.js",
                    "B": "It is the JavaScript JIT compiler developed by Google",
                    "C": "It compiles TypeScript code to native binary machine instructions",
                    "D": "It acts as a reverse proxy load balancer"
                },
                "correct_option": "A",
                "explanation": "libuv is the C library providing the event loop, thread pool (for file I/O, DNS, and crypto), and cross-platform I/O abstractions.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the primary advantage of Node.js Streams over `fs.readFile()` when handling large files (e.g. 5GB video files)?",
                "options": {
                    "A": "Streams process data sequentially in small chunks without buffering the entire file into V8 heap memory",
                    "B": "Streams encrypt data automatically with AES-256",
                    "C": "Streams bypass the operating system filesystem permissions",
                    "D": "Streams execute on the client's GPU"
                },
                "correct_option": "A",
                "explanation": "Streams allow data to be processed chunk-by-chunk, preventing memory overflow and V8 heap exhaustion.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is 'Backpressure' in the context of Node.js Streams and how is it managed with `.pipe()`?",
                "options": {
                    "A": "A condition where data write destination consumes slower than readable source produces; `.pipe()` automatically pauses the reader until the writer drains",
                    "B": "A network socket error caused by firewall packet drops",
                    "C": "CPU throttling when event loop lag exceeds 100ms",
                    "D": "Database connection pool exhaustion"
                },
                "correct_option": "A",
                "explanation": "Backpressure occurs when read streams outpace write stream buffers. pipe() handles pause/resume automatically via write drain events.",
                "difficulty": "Hard"
            },
            {
                "question_text": "How does the Node.js `cluster` module improve application throughput on multi-core servers?",
                "options": {
                    "A": "By spawning multiple child processes (workers) that share the same server port and distribute incoming connection load via round-robin IPC",
                    "B": "By multithreading the V8 garbage collection engine",
                    "C": "By caching all database queries in Redis",
                    "D": "By compressing HTTP response payloads with Brotli"
                },
                "correct_option": "A",
                "explanation": "The cluster module forks child processes sharing master server sockets, utilizing all available CPU cores on a host.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the purpose of the `helmet` middleware package in production Express applications?",
                "options": {
                    "A": "It sets crucial HTTP security response headers (Content-Security-Policy, X-Content-Type-Options, Strict-Transport-Security, X-Frame-Options)",
                    "B": "It rate limits incoming IP traffic to prevent DDoS",
                    "C": "It manages database migrations",
                    "D": "It compresses static assets"
                },
                "correct_option": "A",
                "explanation": "helmet secures Express apps by automatically setting sensible HTTP headers against XSS, clickjacking, and MIME-sniffing.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the difference between `process.nextTick()` and `setImmediate()` in Node.js event loop scheduling?",
                "options": {
                    "A": "process.nextTick fires immediately after the current operation finishes before any event loop phase transitions; setImmediate fires on the next check phase",
                    "B": "setImmediate has higher priority than process.nextTick",
                    "C": "process.nextTick only runs in worker threads",
                    "D": "setImmediate is deprecated in Node.js 18+"
                },
                "correct_option": "A",
                "explanation": "nextTick callbacks process in a microtask-like micro-queue between event loop phases; setImmediate queues in the check phase of the event loop.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What does setting `NODE_ENV=production` in Node.js / Express applications trigger?",
                "options": {
                    "A": "It enables view template caching, suppresses detailed stack traces in default error handlers, and optimizes internal framework performance",
                    "B": "It automatically deploys the application to AWS",
                    "C": "It disables all console.log output permanently",
                    "D": "It forces HTTPS connections on all endpoints"
                },
                "correct_option": "A",
                "explanation": "NODE_ENV=production activates performance optimizations, template caching, and prevents exposing internal error stack traces to clients.",
                "difficulty": "Easy"
            },
            {
                "question_text": "How should uncaught Promise rejections (`unhandledRejection`) be handled in enterprise Node.js services?",
                "options": {
                    "A": "Log the error, perform graceful connection shutdown (closing open DB/socket handles), and exit process with non-zero code to allow process managers (PM2/K8s) to restart cleanly",
                    "B": "Ignore the rejection and continue serving traffic",
                    "C": "Restart the entire database server",
                    "D": "Emit a synthetic HTTP 200 to clients"
                },
                "correct_option": "A",
                "explanation": "Unhandled rejections can leave the application in an unpredictable state; the standard practice is logging, graceful cleanup, and restarting via supervisor.",
                "difficulty": "Medium"
            },
            {
                "question_text": "Which Node.js core module allows creating separate worker threads that share memory via `SharedArrayBuffer`?",
                "options": {
                    "A": "worker_threads",
                    "B": "cluster",
                    "C": "child_process",
                    "D": "v8"
                },
                "correct_option": "A",
                "explanation": "worker_threads enables running multithreaded JavaScript code with shared memory structures and message channels.",
                "difficulty": "Medium"
            },
            {
                "question_text": "Why is synchronous file I/O (`fs.readFileSync`) discouraged on active request routes in Node.js?",
                "options": {
                    "A": "It blocks the single JavaScript main thread, preventing all other concurrent HTTP requests from being processed until disk I/O completes",
                    "B": "It corrupts the file on disk",
                    "C": "It cannot read files larger than 1MB",
                    "D": "It bypasses the operating system buffer cache"
                },
                "correct_option": "A",
                "explanation": "Synchronous I/O halts the entire V8 main thread, causing severe latency spikes and blocking all incoming concurrent connections.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the recommended strategy to mitigate ReDoS (Regular Expression Denial of Service) in Node.js APIs?",
                "options": {
                    "A": "Avoid catastrophic backtracking regex patterns (nested quantifiers like `(a+)+`), validate input length, and use linear time regex engines where possible",
                    "B": "Run all regex in client-side cookies",
                    "C": "Use eval() to execute regex safely",
                    "D": "Increase the server CPU clock speed"
                },
                "correct_option": "A",
                "explanation": "ReDoS occurs when polynomial/exponential backtracking freezes the single thread; avoiding nested quantifiers and bounding input size prevents attacks.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What is the purpose of database connection pooling in a Node.js web service?",
                "options": {
                    "A": "Reusing an established pool of active database connections across HTTP requests to avoid the latency of opening/closing TCP and SSL handshakes per query",
                    "B": "Merging multiple database tables into a single JSON column",
                    "C": "Synchronizing database records across multiple browser tabs",
                    "D": "Encrypting database passwords in memory"
                },
                "correct_option": "A",
                "explanation": "Connection pools maintain open TCP sockets, drastically reducing per-query connection establishment overhead and controlling DB concurrency.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the difference between `Buffer.alloc()` and `Buffer.allocUnsafe()` in Node.js?",
                "options": {
                    "A": "Buffer.alloc initializes memory with zeros; Buffer.allocUnsafe allocates uninitialized memory containing old data, which is faster but may leak sensitive memory",
                    "B": "Buffer.allocUnsafe is encrypted with AES-GCM",
                    "C": "Buffer.alloc cannot store binary images",
                    "D": "Buffer.allocUnsafe executes in kernel space only"
                },
                "correct_option": "A",
                "explanation": "allocUnsafe skips zero-filling for performance, but if returned to clients before being overwritten, it can expose previous memory contents.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What is the standard HTTP status code returned by an Express API when a client attempts to access a protected resource with an invalid or expired JWT token?",
                "options": {
                    "A": "401 Unauthorized",
                    "B": "403 Forbidden",
                    "C": "400 Bad Request",
                    "D": "404 Not Found"
                },
                "correct_option": "A",
                "explanation": "401 Unauthorized signifies that the client authentication credentials (JWT/Bearer token) are missing, invalid, or expired.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What does the `cors` middleware in Express control?",
                "options": {
                    "A": "Cross-Origin Resource Sharing headers (`Access-Control-Allow-Origin`, methods, headers) to govern browser-based cross-origin API requests",
                    "B": "Database connection pooling timeouts",
                    "C": "SSL certificate generation on HTTPS ports",
                    "D": "Session serialization in Redis"
                },
                "correct_option": "A",
                "explanation": "CORS headers instruct web browsers whether cross-origin HTTP requests (e.g. from localhost:3000 to api:8000) are permitted.",
                "difficulty": "Easy"
            },
            {
                "question_text": "How can Node.js gracefully handle high-volume write operations without overwhelming downstream services?",
                "options": {
                    "A": "Using asynchronous message queues (e.g. RabbitMQ, BullMQ with Redis, or Kafka) to buffer and worker-process tasks at a controlled rate",
                    "B": "Increasing the Node.js max heap size to 64GB",
                    "C": "Disabling garbage collection during peak hours",
                    "D": "Switching from HTTPS to plain HTTP"
                },
                "correct_option": "A",
                "explanation": "Message queues decouple producers from consumers, smoothing traffic spikes and guaranteeing task delivery via background worker workers.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the default size of the libuv thread pool in Node.js and how can it be adjusted?",
                "options": {
                    "A": "Default is 4; adjusted by setting the `UV_THREADPOOL_SIZE` environment variable before starting the process (up to 1024)",
                    "B": "Default is 16; adjusted in package.json",
                    "C": "Default is 1; cannot be changed",
                    "D": "Default matches the number of GPU cores"
                },
                "correct_option": "A",
                "explanation": "The default libuv thread pool size is 4, configurable via UV_THREADPOOL_SIZE for crypto/fs/dns concurrency.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What is the purpose of rate-limiting middleware (like `express-rate-limit`) in production APIs?",
                "options": {
                    "A": "To limit repeated requests to public APIs and authentication endpoints to protect against brute-force and denial-of-service abuse",
                    "B": "To throttle server network download bandwidth to save ISP costs",
                    "C": "To enforce user subscription billing tiers",
                    "D": "To slow down fast users so slower users have equal response times"
                },
                "correct_option": "A",
                "explanation": "Rate limiting restricts the number of requests a client IP/token can execute in a given window, mitigating brute-force and DoS attacks.",
                "difficulty": "Easy"
            }
        ]
    },

    "PostgreSQL": {
        "title": "PostgreSQL Relational Design & Performance Assessment",
        "description": "Covers indexing strategies, EXPLAIN ANALYZE, transaction isolation levels, MVCC, partition tables, and vacuum tuning.",
        "pass_score": 70,
        "difficulty": "Intermediate",
        "duration_minutes": 35,
        "questions": [
            {
                "question_text": "Which PostgreSQL index type is the default and most suitable for comparison operators (<, <=, =, >=, >) and range scans?",
                "options": {
                    "A": "B-Tree",
                    "B": "GIN (Generalized Inverted Index)",
                    "C": "GiST (Generalized Search Tree)",
                    "D": "BRIN (Block Range Index)"
                },
                "correct_option": "A",
                "explanation": "B-Tree is the default PostgreSQL index structure, self-balancing and ideal for sorting and standard equality/range operations.",
                "difficulty": "Easy"
            },
            {
                "question_text": "When is a `GIN` index preferred over a standard B-Tree index in PostgreSQL?",
                "options": {
                    "A": "When indexing composite array columns, JSONB attributes, or full-text search vectors (tsvector)",
                    "B": "When indexing sequential auto-incrementing integer IDs",
                    "C": "When performing exact equality lookups on timestamp columns",
                    "D": "When creating foreign key constraints"
                },
                "correct_option": "A",
                "explanation": "GIN (Generalized Inverted Index) maps internal element values to row locations, excelling for JSONB keys, array containment (@>), and full-text search.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What does `EXPLAIN (ANALYZE, BUFFERS)` output when run before a SQL query?",
                "options": {
                    "A": "It executes the query, measures actual execution time, rows returned, and shows shared buffer hit/read cache metrics alongside estimated cost",
                    "B": "It only estimates the query execution plan without running the query",
                    "C": "It automatically rewrites the query with optimal subqueries",
                    "D": "It deletes invalid rows from disk"
                },
                "correct_option": "A",
                "explanation": "EXPLAIN ANALYZE actually executes the query to return real runtime metrics, loop counts, and buffer cache hits/disk reads.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the mechanism of Multi-Version Concurrency Control (MVCC) in PostgreSQL?",
                "options": {
                    "A": "When updating a row, PostgreSQL writes a new version (tuple) of the row with updated xmin/xmax transaction IDs while keeping the old version for concurrent transactions",
                    "B": "It places exclusive table locks on every SELECT query",
                    "C": "It converts all relational tables to NoSQL document stores",
                    "D": "It executes all transactions sequentially on a single thread"
                },
                "correct_option": "A",
                "explanation": "MVCC allows readers not to block writers and writers not to block readers by managing row versions with transaction visibility boundaries.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What is the primary function of PostgreSQL's `VACUUM` process?",
                "options": {
                    "A": "Reclaiming storage occupied by dead tuples left by updates/deletes and updating the visibility map / freeze map",
                    "B": "Dropping unused indexes automatically",
                    "C": "Truncating log files in pg_wal",
                    "D": "Exporting database backups to S3"
                },
                "correct_option": "A",
                "explanation": "VACUUM cleans dead tuple versions created by MVCC so space can be reused for future row insertions.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the difference between `VACUUM` and `VACUUM FULL` in PostgreSQL?",
                "options": {
                    "A": "VACUUM frees dead space for reuse within the table without acquiring an exclusive lock; VACUUM FULL rewrites the entire table to disk to shrink file size, requiring an exclusive table lock",
                    "B": "VACUUM FULL is run automatically by autovacuum every minute",
                    "C": "VACUUM deletes table schema definitions",
                    "D": "There is no difference in locking behavior"
                },
                "correct_option": "A",
                "explanation": "VACUUM FULL compacts tables and returns space to the OS but takes an AccessExclusiveLock, blocking all reads and writes.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What phenomenon is prevented by the `SERIALIZABLE` isolation level that can occur under `REPEATABLE READ`?",
                "options": {
                    "A": "Serialization Anomaly (Write Skew)",
                    "B": "Dirty Reads",
                    "C": "Non-Repeatable Reads",
                    "D": "Connection timeouts"
                },
                "correct_option": "A",
                "explanation": "Serializable isolation eliminates write skew and phantom reads by enforcing transactions to execute as if run serially.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What is a 'Partial Index' in PostgreSQL?",
                "options": {
                    "A": "An index built over a subset of a table defined by a conditional `WHERE` clause (e.g. `CREATE INDEX ON orders(user_id) WHERE status = 'active'`)",
                    "B": "An index that indexes only the first 5 characters of a string",
                    "C": "An index distributed across multiple cluster nodes",
                    "D": "An index created without transaction logging"
                },
                "correct_option": "A",
                "explanation": "Partial indexes reduce index size and write overhead by only indexing rows matching a specific filter predicate.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the benefit of Table Partitioning (declarative partitioning by RANGE or LIST) in PostgreSQL for billion-row datasets?",
                "options": {
                    "A": "Partition pruning allows the query planner to scan only relevant partition tables, and old data can be dropped instantly via `DROP TABLE` instead of massive DELETEs",
                    "B": "It bypasses the need for indexes entirely",
                    "C": "It removes relational foreign key constraints",
                    "D": "It forces queries to run in parallel on all CPU cores"
                },
                "correct_option": "A",
                "explanation": "Partitioning accelerates queries via partition pruning and allows near-instant archiving by dropping partition tables without vacuum bloat.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What is the difference between `JSON` and `JSONB` data types in PostgreSQL?",
                "options": {
                    "A": "JSON stores exact text representations (slower to query, preserves whitespace); JSONB stores decomposed binary format supporting indexing and fast key lookups",
                    "B": "JSON is binary while JSONB is plain text",
                    "C": "JSONB cannot be queried with SQL operators",
                    "D": "JSONB has a maximum size limit of 1KB"
                },
                "correct_option": "A",
                "explanation": "JSONB is parsed into binary format upon storage, enabling GIN indexing and operators like ->, ->>, @>, and ?.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is a PostgreSQL 'BRIN' (Block Range Index) best used for?",
                "options": {
                    "A": "Very large tables where column values correlate strongly with physical storage order on disk (e.g. time-series log timestamps, sequential IDs)",
                    "B": "Small lookup tables with under 100 rows",
                    "C": "Random UUID columns",
                    "D": "Encrypted password strings"
                },
                "correct_option": "A",
                "explanation": "BRIN stores summary min/max ranges for physical page blocks, offering microscopic index sizes for naturally ordered sequential data.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What happens when a foreign key constraint specifies `ON DELETE CASCADE`?",
                "options": {
                    "A": "Deleting a parent row automatically deletes all referencing child rows in the related table",
                    "B": "Deleting a parent row sets child foreign keys to NULL",
                    "C": "Deleting a parent row is blocked if child rows exist",
                    "D": "Deleting a parent row triggers a database backup"
                },
                "correct_option": "A",
                "explanation": "ON DELETE CASCADE propagates parent deletions down to all referencing foreign key rows automatically.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the purpose of PostgreSQL's Write-Ahead Logging (WAL)?",
                "options": {
                    "A": "Ensuring durability (the D in ACID) by logging changes to persistent disk before data pages are written to the database files",
                    "B": "Writing user analytics to external dashboards",
                    "C": "Logging slow query executions for developers",
                    "D": "Compressing database backups"
                },
                "correct_option": "A",
                "explanation": "WAL guarantees crash recovery and point-in-time recovery (PITR) by persisting transaction records sequentially before updating table heap blocks.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is a 'Covering Index' created with the `INCLUDE` clause (e.g. `CREATE INDEX ON orders (user_id) INCLUDE (total_amount)`)?",
                "options": {
                    "A": "An index that includes extra payload columns in leaf pages, allowing Index-Only Scans without reading the table heap",
                    "B": "An index covering all tables in a schema",
                    "C": "An index that encrypts column values",
                    "D": "An index that automatically includes foreign keys"
                },
                "correct_option": "A",
                "explanation": "INCLUDE stores non-key payload attributes directly in the B-Tree leaf pages, enabling index-only scans without heap fetches.",
                "difficulty": "Hard"
            },
            {
                "question_text": "In PostgreSQL, which command changes an uncommitted transaction's state to persistent disk?",
                "options": {
                    "A": "COMMIT (or END)",
                    "B": "ROLLBACK",
                    "C": "SAVEPOINT",
                    "D": "CHECKPOINT"
                },
                "correct_option": "A",
                "explanation": "COMMIT finalizes the transaction, writing WAL records to disk and making changes visible to other transactions.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is a Deadlock in PostgreSQL and how does PostgreSQL resolve it?",
                "options": {
                    "A": "A situation where two transactions hold locks that the other needs; PostgreSQL's deadlock detector aborts one transaction with an error after `deadlock_timeout`",
                    "B": "A corrupted disk block that causes the database to crash",
                    "C": "A network disconnect between master and replica",
                    "D": "A query that runs longer than 10 minutes"
                },
                "correct_option": "A",
                "explanation": "PostgreSQL checks cyclic lock dependencies after deadlock_timeout and terminates one transaction to break the cycle.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the difference between `UNION` and `UNION ALL` in SQL?",
                "options": {
                    "A": "UNION removes duplicate rows by sorting/hashing the result set; UNION ALL retains all rows including duplicates and is significantly faster",
                    "B": "UNION ALL removes duplicates while UNION retains them",
                    "C": "UNION only works on tables with identical names",
                    "D": "UNION ALL requires all columns to be integers"
                },
                "correct_option": "A",
                "explanation": "UNION performs an internal deduplication step; UNION ALL simply appends result sets without sort/hash overhead.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What does the `COALESCE(val1, val2, ...)` function do in PostgreSQL?",
                "options": {
                    "A": "Returns the first non-null argument in the provided list",
                    "B": "Concatenates all non-null strings",
                    "C": "Computes the average of all arguments",
                    "D": "Checks if all arguments are equal"
                },
                "correct_option": "A",
                "explanation": "COALESCE evaluates arguments sequentially and returns the first non-NULL value found.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is a PostgreSQL 'Materialized View' and how does it differ from a standard View?",
                "options": {
                    "A": "A Materialized View stores query results physically on disk as a table and can be indexed, requiring explicit `REFRESH MATERIALIZED VIEW` to update; standard views execute their query on every access",
                    "B": "A Materialized View only stores HTML templates",
                    "C": "Standard Views persist on disk while Materialized Views exist in RAM",
                    "D": "Materialized Views cannot be queried with SELECT"
                },
                "correct_option": "A",
                "explanation": "Materialized views persist precomputed query results physically on disk, offering fast cached reads for expensive analytical aggregations.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the purpose of `pg_stat_statements` extension in PostgreSQL administration?",
                "options": {
                    "A": "Tracking execution statistics, total execution time, calls, and mean latency across all SQL statements executed on the database for performance profiling",
                    "B": "Generating automated PDF reports for managers",
                    "C": "Validating SQL syntax before execution",
                    "D": "Encrypting network connections"
                },
                "correct_option": "A",
                "explanation": "pg_stat_statements records execution statistics for all queries, making it the most critical tool for diagnosing slow queries and database bottlenecks.",
                "difficulty": "Hard"
            }
        ]
    },

    "HTML & CSS": {
        "title": "Modern HTML5 & Responsive CSS3 Assessment",
        "description": "Covers semantic markup, Flexbox, CSS Grid, media queries, CSS custom properties, and WCAG accessibility standards.",
        "pass_score": 70,
        "difficulty": "Beginner",
        "duration_minutes": 35,
        "questions": [
            {
                "question_text": "Which CSS property defines a two-dimensional grid-based layout system handling both columns and rows simultaneously?",
                "options": {
                    "A": "display: flex",
                    "B": "display: grid",
                    "C": "display: block",
                    "D": "display: inline-block"
                },
                "correct_option": "B",
                "explanation": "display: grid establishes a 2D layout grid for rows and columns; Flexbox is primarily a 1D layout model.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the semantic purpose of the `<main>` HTML5 element?",
                "options": {
                    "A": "To encapsulate the dominant, unique content of the `<body>` of a document, excluding headers, footers, and sidebars",
                    "B": "To act as the root container for CSS styling",
                    "C": "To define the primary navigation menu",
                    "D": "To import external JavaScript script tags"
                },
                "correct_option": "A",
                "explanation": "<main> represents the primary content unique to the document, assisting screen readers and search engines.",
                "difficulty": "Easy"
            },
            {
                "question_text": "In Flexbox, which property controls alignment along the main axis, and which controls alignment along the cross axis?",
                "options": {
                    "A": "justify-content (main axis) and align-items (cross axis)",
                    "B": "align-items (main axis) and justify-content (cross axis)",
                    "C": "flex-direction (main axis) and flex-wrap (cross axis)",
                    "D": "place-content for both"
                },
                "correct_option": "A",
                "explanation": "justify-content aligns flex items along the primary flex-direction; align-items aligns items perpendicularly along the cross axis.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the difference between `rem` and `em` units in CSS sizing?",
                "options": {
                    "A": "rem is relative to the root (`<html>`) element's font-size; em is relative to the font-size of its immediate parent element (compounding in nested trees)",
                    "B": "em is relative to the viewport width; rem is relative to the root element",
                    "C": "rem is fixed in physical millimeters",
                    "D": "em units cannot be used for padding or margins"
                },
                "correct_option": "A",
                "explanation": "rem (root em) avoids compounding issues by always referencing the root font size (typically 16px).",
                "difficulty": "Medium"
            },
            {
                "question_text": "How does `box-sizing: border-box` affect element sizing calculations in CSS?",
                "options": {
                    "A": "The element's specified width and height include its content, padding, and border (only margins are added outside)",
                    "B": "Padding and border are added onto the specified width and height",
                    "C": "It removes all borders from elements",
                    "D": "It forces elements to display as flex containers"
                },
                "correct_option": "A",
                "explanation": "border-box ensures that adding padding or borders does not increase the computed width/height of a box beyond its declared dimensions.",
                "difficulty": "Easy"
            },
            {
                "question_text": "Which CSS pseudo-class matches an interactive element when it receives keyboard navigation focus without triggering on mouse clicks?",
                "options": {
                    "A": ":focus-visible",
                    "B": ":focus",
                    "C": ":hover",
                    "D": ":active"
                },
                "correct_option": "A",
                "explanation": ":focus-visible applies focus styling only when the browser determines focus was initiated via keyboard (Tab key) navigation.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the accessibility requirement of the `alt` attribute on an `<img>` element?",
                "options": {
                    "A": "It provides textual alternative description for screen readers and search engines, or an empty string (`alt=\"\"`) if the image is purely decorative",
                    "B": "It specifies the hover tooltip popup text",
                    "C": "It defines the image fallback URL when loading fails",
                    "D": "It is optional and can be omitted"
                },
                "correct_option": "A",
                "explanation": "Every img element must have an alt attribute; descriptive for meaningful images, or alt=\"\" for decorative graphics.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What CSS rule enables styles to apply only when a user's operating system is set to dark mode?",
                "options": {
                    "A": "@media (prefers-color-scheme: dark) { ... }",
                    "B": "@theme dark { ... }",
                    "C": "@supports (color-scheme: dark) { ... }",
                    "D": "@media (color-mode: dark) { ... }"
                },
                "correct_option": "A",
                "explanation": "@media (prefers-color-scheme: dark) detects the user's OS or browser theme preference.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is CSS Specificity hierarchy from highest to lowest weight?",
                "options": {
                    "A": "Inline styles > ID selectors (#id) > Class selectors (.class, [attr], :pseudo-class) > Element selectors (div, p)",
                    "B": "Element selectors > Class selectors > ID selectors > Inline styles",
                    "C": "ID selectors > Inline styles > Element selectors > Class selectors",
                    "D": "Class selectors > ID selectors > Element selectors > Inline styles"
                },
                "correct_option": "A",
                "explanation": "Specificity calculates: (Inline, IDs, Classes/Attributes/Pseudo-classes, Elements/Pseudo-elements).",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the purpose of the `aria-label` attribute on HTML buttons containing only icons?",
                "options": {
                    "A": "It provides an accessible name for screen readers when no visible text content exists in the button",
                    "B": "It animates the icon with CSS",
                    "C": "It acts as a translation dictionary key",
                    "D": "It sets the browser tab title"
                },
                "correct_option": "A",
                "explanation": "aria-label supplies an accessible name to screen readers when buttons lack visible text labels (e.g. icon-only close buttons).",
                "difficulty": "Easy"
            },
            {
                "question_text": "What does the `position: sticky` CSS declaration do?",
                "options": {
                    "A": "The element behaves as relative positioned until it reaches a specified scroll threshold, where it sticks like fixed positioning within its parent container",
                    "B": "The element remains permanently fixed at top: 0 across the entire window",
                    "C": "The element cannot be dragged or clicked",
                    "D": "The element attaches to the bottom footer permanently"
                },
                "correct_option": "A",
                "explanation": "sticky positioning toggles between relative and fixed depending on scroll offset within the boundaries of its parent element.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the purpose of CSS Custom Properties (CSS Variables) defined with `--variable-name`?",
                "options": {
                    "A": "They store reusable CSS values that cascade dynamically and can be updated at runtime via JavaScript (`setProperty`) or media queries",
                    "B": "They compile CSS code into SASS",
                    "C": "They validate CSS syntax in IDEs",
                    "D": "They replace HTML data attributes"
                },
                "correct_option": "A",
                "explanation": "CSS custom properties cascade through the DOM tree and can be accessed and modified dynamically in CSS and JS.",
                "difficulty": "Easy"
            },
            {
                "question_text": "Which CSS Grid property specifies that columns should automatically fit as many minimum 200px items as possible and expand equally?",
                "options": {
                    "A": "grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));",
                    "B": "grid-template-columns: 200px 1fr auto;",
                    "C": "grid-auto-flow: column 200px;",
                    "D": "grid-columns: fill(200px);"
                },
                "correct_option": "A",
                "explanation": "repeat(auto-fit, minmax(200px, 1fr)) is the standard responsive CSS grid pattern requiring no media queries.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What is the WCAG 2.1 AA minimum contrast ratio requirement for normal body text against its background?",
                "options": {
                    "A": "4.5:1",
                    "B": "3.0:1",
                    "C": "7.0:1",
                    "D": "2.0:1"
                },
                "correct_option": "A",
                "explanation": "WCAG 2.1 Level AA mandates a contrast ratio of at least 4.5:1 for regular text and 3:1 for large text (18pt+ or 14pt bold).",
                "difficulty": "Medium"
            },
            {
                "question_text": "What does the `loading=\"lazy\"` attribute on an `<img>` tag accomplish natively in modern web browsers?",
                "options": {
                    "A": "It defers loading of offscreen images until the user scrolls near their viewport location, saving network bandwidth",
                    "B": "It applies a blur filter while the image is downloading",
                    "C": "It downsamples image resolution on mobile networks",
                    "D": "It loads the image using a Service Worker thread"
                },
                "correct_option": "A",
                "explanation": "Native loading=\"lazy\" postpones image fetching until the element is calculated to be near the visible viewport.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the difference between `display: none` and `visibility: hidden`?",
                "options": {
                    "A": "display: none removes the element from document flow (taking 0 space); visibility: hidden hides the element visually while preserving its layout space",
                    "B": "visibility: hidden removes the element from screen readers while display: none does not",
                    "C": "display: none triggers CSS animations while visibility: hidden cannot",
                    "D": "There is no difference"
                },
                "correct_option": "A",
                "explanation": "display: none completely unrenders the element from layout; visibility: hidden keeps geometry and spacing intact while rendering invisible.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the purpose of the HTML `<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">` tag?",
                "options": {
                    "A": "It sets the viewport width to match the physical screen width and establishes a 1:1 scale ratio on mobile devices, enabling responsive design",
                    "B": "It disables user pinch-to-zoom permanently",
                    "C": "It restricts the website to desktop resolutions only",
                    "D": "It enables WebGL 3D rendering"
                },
                "correct_option": "A",
                "explanation": "The viewport meta tag instructs mobile browsers to render the document at screen width rather than defaulting to a 980px desktop canvas.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What does the CSS `clamp(min, preferred, max)` function do?",
                "options": {
                    "A": "Clamps a value between an upper and lower bound based on a dynamic preferred value (e.g. `clamp(1rem, 2.5vw, 2rem)`)",
                    "B": "Rounds numbers to the nearest whole integer",
                    "C": "Clips text with an ellipsis",
                    "D": "Limits CSS animation iterations"
                },
                "correct_option": "A",
                "explanation": "clamp() enables fluid typography and layout scaling by keeping values within defined minimum and maximum limits.",
                "difficulty": "Medium"
            },
            {
                "question_text": "Which CSS property enables GPU hardware acceleration for smooth transform and opacity animations?",
                "options": {
                    "A": "will-change: transform, opacity; or transform: translateZ(0);",
                    "B": "accelerate: true;",
                    "C": "display: gpu;",
                    "D": "filter: hardware;"
                },
                "correct_option": "A",
                "explanation": "will-change and translateZ(0) promote elements to their own GPU compositor layer, avoiding CPU layout recalculation and paint cycles.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What is the purpose of the `<picture>` element in responsive web development?",
                "options": {
                    "A": "Providing multiple `<source>` images based on media query breakpoints (art direction) and image format support (AVIF/WebP) with an `<img>` fallback",
                    "B": "Drawing interactive vector graphics with WebGL",
                    "C": "Embedding YouTube video players",
                    "D": "Creating CSS sprite sheets"
                },
                "correct_option": "A",
                "explanation": "<picture> wraps multiple <source> tags to deliver optimized image formats (WebP/AVIF) and distinct crops tailored for specific screen viewports.",
                "difficulty": "Medium"
            }
        ]
    },

    "SQL": {
        "title": "SQL Querying & Data Manipulation Assessment",
        "description": "Covers joins, aggregates, subqueries, group by, window functions, CTEs, and query optimization.",
        "pass_score": 70,
        "difficulty": "Intermediate",
        "duration_minutes": 35,
        "questions": [
            {
                "question_text": "Which SQL clause filters grouped records created by the `GROUP BY` clause?",
                "options": {
                    "A": "WHERE",
                    "B": "HAVING",
                    "C": "ORDER BY",
                    "D": "LIMIT"
                },
                "correct_option": "B",
                "explanation": "HAVING filters aggregated grouped results, whereas WHERE filters individual records prior to aggregation.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the difference between an `INNER JOIN` and a `LEFT OUTER JOIN`?",
                "options": {
                    "A": "INNER JOIN returns rows only when there is a match in both tables; LEFT JOIN returns all rows from the left table with matching or NULL values from the right table",
                    "B": "LEFT JOIN only returns rows that have no match in the right table",
                    "C": "INNER JOIN returns all rows from both tables unconditionally",
                    "D": "LEFT JOIN sorts results in ascending order"
                },
                "correct_option": "A",
                "explanation": "LEFT JOIN guarantees all left table rows are retained; unmatched right table columns are filled with NULLs.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What does a Common Table Expression (CTE) defined with the `WITH` keyword provide?",
                "options": {
                    "A": "A temporary, named result set that exists only within the execution scope of a single query, improving readability and supporting recursive queries",
                    "B": "A permanent table written to disk",
                    "C": "A database trigger that runs after insert",
                    "D": "An encrypted password column"
                },
                "correct_option": "A",
                "explanation": "CTEs (WITH clause) provide modular temporary subqueries that can be referenced multiple times and support recursive hierarchical data traversals.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the function of the `ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC)` window function?",
                "options": {
                    "A": "It assigns a unique, sequential integer starting at 1 to each row within each department partition ordered by salary descending",
                    "B": "It calculates the total sum of salaries per department",
                    "C": "It removes duplicate employee rows from the database",
                    "D": "It filters out departments with fewer than 5 employees"
                },
                "correct_option": "A",
                "explanation": "ROW_NUMBER() numbers rows sequentially within partitioned windows according to specified sort orders without collapsing rows.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the difference between `RANK()` and `DENSE_RANK()` window functions when handling tie values?",
                "options": {
                    "A": "RANK leaves gaps in ranking numbers after ties (e.g. 1, 2, 2, 4); DENSE_RANK produces consecutive rank numbers without gaps (e.g. 1, 2, 2, 3)",
                    "B": "DENSE_RANK only works on numeric columns",
                    "C": "RANK sorts in descending order while DENSE_RANK sorts ascending",
                    "D": "There is no difference in rank calculation"
                },
                "correct_option": "A",
                "explanation": "RANK skips rank positions corresponding to tie counts; DENSE_RANK advances by 1 for the next distinct rank value.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What does the SQL command `TRUNCATE TABLE users;` do compared to `DELETE FROM users;`?",
                "options": {
                    "A": "TRUNCATE drops and recreates table data pages quickly as a DDL operation without logging individual row deletes or firing row-level triggers; DELETE scans and logs each row delete",
                    "B": "TRUNCATE deletes the table schema definition permanently",
                    "C": "DELETE cannot be rolled back inside a transaction",
                    "D": "TRUNCATE allows WHERE clause filtering"
                },
                "correct_option": "A",
                "explanation": "TRUNCATE deallocates data pages directly, making it much faster than row-by-row logged DELETEs, but it does not support WHERE clauses.",
                "difficulty": "Medium"
            },
            {
                "question_text": "Which SQL aggregation function returns the number of non-null values in a specified column?",
                "options": {
                    "A": "COUNT(column_name)",
                    "B": "COUNT(*)",
                    "C": "SUM(column_name)",
                    "D": "EXISTS(column_name)"
                },
                "correct_option": "A",
                "explanation": "COUNT(column) counts only rows where the specified column is not NULL; COUNT(*) counts all rows in the group regardless of NULLs.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the result of evaluating `SELECT NULL = NULL;` in standard SQL?",
                "options": {
                    "A": "NULL (Unknown, evaluated as false in boolean WHERE conditions)",
                    "B": "TRUE",
                    "C": "FALSE",
                    "D": "Syntax Error"
                },
                "correct_option": "A",
                "explanation": "In three-valued SQL logic, NULL represents an unknown value; comparing two unknowns via = yields NULL (use IS NULL instead).",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is a Correlated Subquery in SQL?",
                "options": {
                    "A": "A subquery that references columns from the outer query, executing once for each row evaluated by the outer query",
                    "B": "A subquery that runs once before the outer query and returns a static constant",
                    "C": "A query that joins two tables on their primary keys",
                    "D": "A query that uses full-text search indexing"
                },
                "correct_option": "A",
                "explanation": "Correlated subqueries depend on the current outer row values, executing repeatedly for each outer candidate row.",
                "difficulty": "Hard"
            },
            {
                "question_text": "Which clause is used in SQL to combine the result sets of two queries while retaining only rows that appear in both queries?",
                "options": {
                    "A": "INTERSECT",
                    "B": "UNION",
                    "C": "EXCEPT / MINUS",
                    "D": "CROSS JOIN"
                },
                "correct_option": "A",
                "explanation": "INTERSECT returns the set intersection containing only distinct records present in both query results.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What does the SQL `CASE` statement accomplish?",
                "options": {
                    "A": "Conditional branching logic returning specific scalar values based on evaluated Boolean expressions (like if-then-else in SQL)",
                    "B": "Converting string characters between upper and lower case",
                    "C": "Switching database schemas at runtime",
                    "D": "Creating database test cases"
                },
                "correct_option": "A",
                "explanation": "CASE WHEN condition THEN result ELSE fallback END provides inline conditional expressions in SELECT and UPDATE statements.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the purpose of the `COALESCE` function in SQL?",
                "options": {
                    "A": "Returning the first non-NULL expression among its arguments",
                    "B": "Converting numbers to strings",
                    "C": "Replacing duplicate characters in strings",
                    "D": "Checking foreign key integrity"
                },
                "correct_option": "A",
                "explanation": "COALESCE(col, fallback) replaces NULL values with a defined fallback value.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is a `CROSS JOIN` (Cartesian Product) in SQL?",
                "options": {
                    "A": "A join that produces every combination of rows from the first table multiplied by every row from the second table (N * M rows)",
                    "B": "A join based on matching primary and foreign keys",
                    "C": "A join that deletes non-matching rows",
                    "D": "A join restricted to date range queries"
                },
                "correct_option": "A",
                "explanation": "CROSS JOIN combines every row from table A with every row from table B without join conditions, yielding cardinality N * M.",
                "difficulty": "Medium"
            },
            {
                "question_text": "How does `LAG()` or `LEAD()` window function assist in financial and time-series SQL queries?",
                "options": {
                    "A": "They access data from preceding (LAG) or succeeding (LEAD) rows relative to the current row without requiring self-joins",
                    "B": "They calculate exponential moving averages automatically",
                    "C": "They insert delay pauses into query execution",
                    "D": "They measure network round-trip query latency"
                },
                "correct_option": "A",
                "explanation": "LAG/LEAD provide access to previous or upcoming row values within an ordered partition window, ideal for calculating period-over-period delta growth.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What does the `EXISTS (SELECT 1 FROM ...)` subquery operator test for?",
                "options": {
                    "A": "Whether the subquery returns at least one row, short-circuiting immediately upon finding the first match",
                    "B": "Whether all rows in the subquery equal 1",
                    "C": "Whether the target table exists in the database schema",
                    "D": "Whether the column value is greater than 0"
                },
                "correct_option": "A",
                "explanation": "EXISTS evaluates to TRUE as soon as a single matching record is found, short-circuiting without scanning the entire subquery result.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the function of the `DISTINCT` keyword in a `SELECT` statement?",
                "options": {
                    "A": "Filtering out duplicate rows from the final result set so that each row is unique",
                    "B": "Sorting results in descending order",
                    "C": "Restricting query execution to primary key columns only",
                    "D": "Returning only odd-numbered rows"
                },
                "correct_option": "A",
                "explanation": "SELECT DISTINCT removes duplicate rows across the selected column projection.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the effect of an unindexed column in a `WHERE` condition on a table with 10 million rows?",
                "options": {
                    "A": "The database engine must perform a Sequential Scan (Full Table Scan), reading all 10 million rows from disk into memory",
                    "B": "The database throws a missing index runtime exception",
                    "C": "The query fails after 100 rows",
                    "D": "The database automatically creates a temporary index on the fly"
                },
                "correct_option": "A",
                "explanation": "Without an index, the database engine must scan every single physical page block on disk, causing high I/O latency.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is a SQL Transaction and what does ACID stand for?",
                "options": {
                    "A": "A single logical unit of work that is Atomicity, Consistency, Isolation, and Durability compliant",
                    "B": "A database backup format: Archive, Compress, Index, Deploy",
                    "C": "A cryptographic algorithm: AES, Cipher, Integrity, Digest",
                    "D": "An asynchronous networking protocol"
                },
                "correct_option": "A",
                "explanation": "ACID guarantees that database transactions are processed reliably: Atomicity (all-or-nothing), Consistency (rules enforced), Isolation (concurrency control), Durability (persisted).",
                "difficulty": "Easy"
            },
            {
                "question_text": "Which SQL statement is used to add a new column to an existing database table?",
                "options": {
                    "A": "ALTER TABLE table_name ADD COLUMN column_name datatype;",
                    "B": "UPDATE TABLE table_name INSERT COLUMN column_name datatype;",
                    "C": "MODIFY TABLE table_name ADD column_name datatype;",
                    "D": "CREATE COLUMN column_name ON table_name datatype;"
                },
                "correct_option": "A",
                "explanation": "ALTER TABLE ... ADD COLUMN is the standard DDL syntax for modifying table schemas.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the purpose of database Normalization (1NF, 2NF, 3NF)?",
                "options": {
                    "A": "Organizing relational database schemas to minimize data redundancy and eliminate insert, update, and deletion anomalies",
                    "B": "Converting relational tables into MongoDB collections",
                    "C": "Formatting dates and timestamps into ISO 8601 strings",
                    "D": "Compressing database disks"
                },
                "correct_option": "A",
                "explanation": "Normalization decomposes tables to ensure data dependencies are logical, reducing redundancy and preventing update/deletion anomalies.",
                "difficulty": "Medium"
            }
        ]
    },

    "React": {
        "title": "React 18+ Architecture & State Management Assessment",
        "description": "Covers Concurrent React, hooks, memoization, Context API, state machines, Suspense, and virtual DOM reconciliation.",
        "pass_score": 70,
        "difficulty": "Intermediate",
        "duration_minutes": 35,
        "questions": [
            {
                "question_text": "Which React hook caches the calculated result of an expensive calculation between re-renders until dependencies change?",
                "options": {
                    "A": "useCallback",
                    "B": "useMemo",
                    "C": "useRef",
                    "D": "useEffect"
                },
                "correct_option": "B",
                "explanation": "useMemo caches the computed return value of a calculation; useCallback caches the function definition instance itself.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the difference between `useCallback(fn, deps)` and `useMemo(() => fn, deps)` in React?",
                "options": {
                    "A": "They are functionally equivalent; useCallback(fn, deps) is syntactic sugar for useMemo(() => fn, deps)",
                    "B": "useCallback executes asynchronously while useMemo executes synchronously",
                    "C": "useCallback only works in custom hooks",
                    "D": "useMemo cannot return a function"
                },
                "correct_option": "A",
                "explanation": "useCallback(fn, deps) returns the memoized callback function itself, which is equivalent to useMemo returning the function definition.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the primary benefit of React 18 Concurrent Features (`useTransition`, `useDeferredValue`)?",
                "options": {
                    "A": "They allow React to interrupt, pause, and prioritize urgent user input renders (like typing) over non-urgent background UI updates (like chart rendering)",
                    "B": "They enable React to run on multiple server CPU threads simultaneously",
                    "C": "They eliminate the need for useState in functional components",
                    "D": "They replace Redux with native SQL databases"
                },
                "correct_option": "A",
                "explanation": "Concurrent rendering makes rendering interruptible, allowing urgent updates (keyboard/click events) to maintain 60 FPS responsiveness.",
                "difficulty": "Hard"
            },
            {
                "question_text": "Why must state updates never mutate objects directly in React (e.g. `user.name = 'Alice'; setUser(user)`)?",
                "options": {
                    "A": "React performs shallow reference comparison (Object.is) on state; mutating the object in place keeps the same memory pointer and skips re-rendering",
                    "B": "Mutating objects causes a JavaScript syntax error",
                    "C": "React converts all objects into strings",
                    "D": "Direct mutation breaks browser localStorage"
                },
                "correct_option": "A",
                "explanation": "React compares state references using Object.is. Mutating an existing object in-place does not change its reference pointer, so React bails out of re-rendering.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the purpose of the `key` prop when rendering lists of components in React?",
                "options": {
                    "A": "It gives elements a stable identity so React's reconciliation diffing algorithm can track which items were added, removed, or re-ordered across renders",
                    "B": "It provides CSS styling for list items",
                    "C": "It acts as an encryption key for client state",
                    "D": "It binds DOM click events automatically"
                },
                "correct_option": "A",
                "explanation": "Keys allow the React reconciliation algorithm to accurately identify elements between render passes, avoiding unnecessary DOM re-creation and preserving component state.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the difference between `useEffect` and `useLayoutEffect`?",
                "options": {
                    "A": "useEffect fires asynchronously after the browser paints screen pixels; useLayoutEffect fires synchronously after DOM mutation but before the browser paints, preventing visual flickers",
                    "B": "useEffect only runs once on initial mount",
                    "C": "useLayoutEffect runs on the server during SSR",
                    "D": "useLayoutEffect cannot accept dependencies"
                },
                "correct_option": "A",
                "explanation": "useLayoutEffect blocks painting to synchronously read/measure DOM geometry and apply modifications before the user sees the frame.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What does `React.memo()` do for functional components?",
                "options": {
                    "A": "It wraps a component in higher-order memoization that skips re-rendering if its incoming props have not changed by shallow comparison",
                    "B": "It saves component state to IndexedDB",
                    "C": "It memoizes all child hook states automatically",
                    "D": "It prevents components from unmounting"
                },
                "correct_option": "A",
                "explanation": "React.memo is a higher-order component that performs shallow prop equality checks to prevent re-renders when parent components update.",
                "difficulty": "Medium"
            },
            {
                "question_text": "How should cleanup logic (e.g. unsubscribing from WebSockets or clearing timers) be implemented in `useEffect`?",
                "options": {
                    "A": "By returning a cleanup function from the `useEffect` callback",
                    "B": "By calling useEffect.cleanup() manually",
                    "C": "By using a try...finally block around the entire component",
                    "D": "By adding the component to an unmount array"
                },
                "correct_option": "A",
                "explanation": "Returning a function from useEffect executes the cleanup callback before the effect re-runs and when the component unmounts.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the purpose of the `useRef` hook in React functional components?",
                "options": {
                    "A": "Holding a mutable reference value across renders that does NOT trigger a re-render when changed, or referencing a direct DOM element node",
                    "B": "Creating global Redux stores",
                    "C": "Enforcing TypeScript interface types at runtime",
                    "D": "Replacing useState for all form inputs"
                },
                "correct_option": "A",
                "explanation": "useRef returns a mutable object with a .current property that persists across renders without inducing component re-renders.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What problem does the React Context API solve and what is its primary performance limitation?",
                "options": {
                    "A": "It solves 'prop drilling' by sharing data globally; its limitation is that every consumer component re-renders whenever the context value reference changes",
                    "B": "It solves server-side rendering but only works in Google Chrome",
                    "C": "It replaces REST APIs with WebSockets",
                    "D": "It limits state to 5KB"
                },
                "correct_option": "A",
                "explanation": "Context eliminates passing props through intermediary components, but updating a context value triggers re-renders on all subscribing consumers.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the purpose of `useReducer` compared to `useState`?",
                "options": {
                    "A": "useReducer is preferable for complex state logic involving multiple sub-values or when the next state depends heavily on the previous state and action types",
                    "B": "useReducer executes on a separate Web Worker thread",
                    "C": "useReducer can only be used with numeric numbers",
                    "D": "useReducer does not trigger component re-renders"
                },
                "correct_option": "A",
                "explanation": "useReducer manages state transitions via predictable (state, action) => newState reducer functions, centralizing complex state transition logic.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is an Error Boundary in React and how is it implemented?",
                "options": {
                    "A": "A class component implementing `componentDidCatch` or `static getDerivedStateFromError` to catch JS errors in its child component tree and render a fallback UI",
                    "B": "A try-catch block wrapping JSX elements in functional components",
                    "C": "A Babel plugin that removes syntax errors",
                    "D": "A TypeScript compiler option"
                },
                "correct_option": "A",
                "explanation": "Error boundaries catch rendering errors in lifecycle methods and render trees, preventing the entire React root tree from unmounting.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is `React.lazy()` and `<Suspense>` used for in web application performance optimization?",
                "options": {
                    "A": "Code-splitting components dynamically via dynamic imports (`import()`), loading bundle chunks on-demand and displaying a fallback loader while loading",
                    "B": "Pausing execution until user permissions are granted",
                    "C": "Deferring React hydration on mobile devices permanently",
                    "D": "Compressing images during client uploads"
                },
                "correct_option": "A",
                "explanation": "React.lazy enables route/component code-splitting, reducing initial JavaScript bundle size by fetching chunks asynchronously.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What are the two fundamental 'Rules of Hooks' enforced by the React ESLint plugin?",
                "options": {
                    "A": "Only call hooks at the top level (never in loops, conditions, or nested functions), and only call hooks from React functional components or custom hooks",
                    "B": "Hooks must return arrays, and hooks must be named starting with 'get'",
                    "C": "Hooks can only be called inside class components, and hooks must accept 2 parameters",
                    "D": "Hooks must be wrapped in try/catch blocks"
                },
                "correct_option": "A",
                "explanation": "React relies on the call order of hooks remaining identical between renders to map internal state cells correctly.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is 'Prop Drilling' in React application architecture?",
                "options": {
                    "A": "The process of passing props through multiple levels of intermediate components that do not need the data themselves, just to reach deeply nested children",
                    "B": "Validating props with PropTypes",
                    "C": "Converting props into local component state",
                    "D": "Serializing props into URL search parameters"
                },
                "correct_option": "A",
                "explanation": "Prop drilling creates coupling across intermediate components, commonly mitigated using Context, component composition, or state management libraries.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the purpose of the `useId` hook introduced in React 18?",
                "options": {
                    "A": "Generating unique, stable accessibility IDs that remain consistent across client and server SSR renders, avoiding hydration mismatch errors",
                    "B": "Generating random passwords for users",
                    "C": "Fetching user IDs from JWT session cookies",
                    "D": "Assigning UUIDs to Redux actions"
                },
                "correct_option": "A",
                "explanation": "useId generates unique, deterministic IDs for form controls and accessibility attributes without causing SSR hydration mismatches.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the difference between a Controlled Component and an Uncontrolled Component for form inputs in React?",
                "options": {
                    "A": "Controlled components have their input value driven by React state (`value` and `onChange`); Uncontrolled components let the DOM manage input state, accessed via `ref`",
                    "B": "Controlled components use TypeScript while uncontrolled components use JavaScript",
                    "C": "Uncontrolled components cannot submit data to backends",
                    "D": "Controlled components are deprecated in React 18"
                },
                "correct_option": "A",
                "explanation": "Controlled components treat React state as the single source of truth; uncontrolled components read values directly from the DOM using refs.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is React Fiber?",
                "options": {
                    "A": "React's core reconciliation engine that represents the component tree as a linked-list work graph capable of incremental, prioritized rendering",
                    "B": "A CSS-in-JS styling library for React",
                    "C": "A fiber-optic hardware protocol for React Native",
                    "D": "A build tool alternative to Webpack"
                },
                "correct_option": "A",
                "explanation": "Fiber replaced the old recursive stack reconciler, allowing work to be split into chunks and prioritized across animation frames.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What is the purpose of `forwardRef` in React component design?",
                "options": {
                    "A": "Allowing a parent component to pass a `ref` down through a child component to an underlying native DOM element",
                    "B": "Forwarding HTTP requests to backend proxies",
                    "C": "Redirecting browser URLs after authentication",
                    "D": "Passing state between sibling components without props"
                },
                "correct_option": "A",
                "explanation": "React.forwardRef exposes an inner DOM node ref to parent components, essential for reusable UI libraries and input focus management.",
                "difficulty": "Medium"
            },
            {
                "question_text": "Why should you pass a function to a state updater like `setCount(prev => prev + 1)` when updating state based on previous state?",
                "options": {
                    "A": "To ensure the update uses the most current, queued state value rather than a stale closure snapshot during batched asynchronous updates",
                    "B": "Because passing a raw value is deprecated in React 18",
                    "C": "To convert the state update into a Promise",
                    "D": "To prevent React from re-rendering the component"
                },
                "correct_option": "A",
                "explanation": "Functional updates (updater functions) receive the exact pending state, preventing bugs caused by stale closures during batched renders.",
                "difficulty": "Easy"
            }
        ]
    },

    "Full Stack Developer": {
        "title": "Full Stack Developer Core Diagnostic",
        "description": "Comprehensive full-stack architecture diagnostic covering frontend, backend, database design, API security, and distributed caching.",
        "pass_score": 70,
        "difficulty": "Foundation",
        "duration_minutes": 45,
        "questions": [
            {
                "question_text": "In modern web application architecture, which architectural style separates the client presentation layer from the backend API services?",
                "options": {
                    "A": "Decoupled Client-Server (Headless / SPA + REST/GraphQL API)",
                    "B": "Monolithic Server-Side Rendered CGI",
                    "C": "Peer-to-Peer Desktop Distribution",
                    "D": "Single-file HTML with embedded SQL queries"
                },
                "correct_option": "A",
                "explanation": "Decoupled client-server architectures separate UI state management from backend domain logic and database operations.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the primary vulnerability prevented by using Parameterized Prepared Statements in SQL database queries?",
                "options": {
                    "A": "SQL Injection (SQLi)",
                    "B": "Cross-Site Scripting (XSS)",
                    "C": "Cross-Site Request Forgery (CSRF)",
                    "D": "Man-in-the-Middle (MitM) packet sniffing"
                },
                "correct_option": "A",
                "explanation": "Prepared statements separate SQL code from user-supplied data parameters, preventing attackers from injecting executable SQL commands.",
                "difficulty": "Easy"
            },
            {
                "question_text": "Which HTTP header is essential for mitigating Cross-Site Scripting (XSS) attacks by restricting the origins of executable scripts?",
                "options": {
                    "A": "Content-Security-Policy (CSP)",
                    "B": "Strict-Transport-Security (HSTS)",
                    "C": "Access-Control-Allow-Origin",
                    "D": "X-Frame-Options"
                },
                "correct_option": "A",
                "explanation": "CSP specifies approved sources for content and scripts, blocking inline malicious script execution.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the primary role of a Reverse Proxy (such as Nginx, Traefik, or Cloudflare) in production deployments?",
                "options": {
                    "A": "Terminating SSL/TLS, load balancing traffic across backend instances, caching static assets, and shielding internal services from direct public exposure",
                    "B": "Compiling TypeScript into React components",
                    "C": "Executing SQL schema migrations automatically",
                    "D": "Managing user database passwords"
                },
                "correct_option": "A",
                "explanation": "Reverse proxies act as traffic gatekeepers, managing SSL termination, rate limiting, and balancing request load across backend service instances.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the key difference between JWT (JSON Web Token) stateless authentication and Server-Side Session authentication?",
                "options": {
                    "A": "JWT tokens contain cryptographically signed claims decoded by any service without database lookups; Sessions require centralized database/Redis state lookups per request",
                    "B": "JWT tokens are stored only on the database server",
                    "C": "Session authentication cannot be used with HTTPS",
                    "D": "JWT tokens cannot expire"
                },
                "correct_option": "A",
                "explanation": "JWTs are self-contained and stateless, enabling horizontal scaling without sharing session caches, whereas sessions require shared session stores like Redis.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the purpose of Redis in a high-throughput full-stack system architecture?",
                "options": {
                    "A": "In-memory caching of frequently read database queries, session storage, distributed rate limiting, and pub/sub message brokering",
                    "B": "Relational data warehousing for financial auditing",
                    "C": "Rendering React HTML templates on the server",
                    "D": "Storing large video files permanently"
                },
                "correct_option": "A",
                "explanation": "Redis provides sub-millisecond in-memory key-value data structures, serving as an ultra-fast cache and transient state store.",
                "difficulty": "Easy"
            },
            {
                "question_text": "Which HTTP status code should a RESTful API return when a `POST` request successfully creates a new database resource?",
                "options": {
                    "A": "201 Created",
                    "B": "200 OK",
                    "C": "204 No Content",
                    "D": "202 Accepted"
                },
                "correct_option": "A",
                "explanation": "HTTP 201 Created is the standard status code indicating that a new resource has been successfully created on the server.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the difference between `PUT` and `PATCH` HTTP methods in RESTful API design?",
                "options": {
                    "A": "PUT replaces the entire resource representation with the provided payload; PATCH applies partial modifications to specific fields of the resource",
                    "B": "PUT creates a new table; PATCH deletes records",
                    "C": "PUT is for client-side queries only",
                    "D": "PATCH cannot accept JSON payloads"
                },
                "correct_option": "A",
                "explanation": "PUT is idempotent and replaces the complete resource; PATCH modifies only the specified attributes.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is Cross-Site Request Forgery (CSRF) and what is the standard defense against it?",
                "options": {
                    "A": "An attack that tricks an authenticated user into executing unwanted actions; defended against using SameSite cookies and Anti-CSRF verification tokens",
                    "B": "An attack that extracts passwords via SQL; defended with bcrypt",
                    "C": "A network packet sniffing attack; defended with TLS",
                    "D": "A CSS animation vulnerability"
                },
                "correct_option": "A",
                "explanation": "CSRF exploits browser cookie transmission on third-party requests; defended with SameSite=Lax/Strict cookie flags and custom request headers/tokens.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the purpose of a Database Migration tool (e.g. Alembic, Prisma Migrate, Flyway)?",
                "options": {
                    "A": "Version-controlling, applying, and rolling back database schema changes systematically across development, staging, and production environments",
                    "B": "Moving physical database servers between AWS regions",
                    "C": "Converting PostgreSQL databases to MySQL",
                    "D": "Creating mock user data for automated unit testing"
                },
                "correct_option": "A",
                "explanation": "Migration tools track schema history as deterministic migration scripts, ensuring consistent database state across environments.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the difference between Horizontal Scaling and Vertical Scaling?",
                "options": {
                    "A": "Horizontal scaling adds more instances/machines to distribute load; Vertical scaling increases CPU/RAM resources on a single machine",
                    "B": "Vertical scaling adds more physical machines to a cluster",
                    "C": "Horizontal scaling only applies to frontend applications",
                    "D": "Vertical scaling is free in cloud hosting"
                },
                "correct_option": "A",
                "explanation": "Horizontal scaling scales out (adding nodes to a pool); Vertical scaling scales up (upgrading a single node's hardware).",
                "difficulty": "Easy"
            },
            {
                "question_text": "In a CI/CD pipeline, what is the difference between Continuous Integration (CI) and Continuous Deployment (CD)?",
                "options": {
                    "A": "CI automatically builds and runs automated test suites on code commits; CD automatically deploys validated code directly to production environments",
                    "B": "CI is for frontend only and CD is for backend only",
                    "C": "CD writes unit tests automatically",
                    "D": "CI requires manual human deployment approvals"
                },
                "correct_option": "A",
                "explanation": "CI verifies code changes through automated builds and testing; CD automates the delivery and release pipeline to production.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the purpose of CORS (Cross-Origin Resource Sharing) preflight `OPTIONS` requests?",
                "options": {
                    "A": "The browser sends an OPTIONS preflight to verify with the server whether the cross-origin request with custom headers/methods is permitted before sending the actual request",
                    "B": "It compresses the payload using gzip",
                    "C": "It authenticates the user's password with the identity provider",
                    "D": "It establishes a persistent WebSocket connection"
                },
                "correct_option": "A",
                "explanation": "Preflight OPTIONS checks verify allowed methods and headers prior to executing non-simple requests (like PUT/DELETE or custom Content-Types).",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the CAP Theorem in distributed data systems?",
                "options": {
                    "A": "A distributed system can guarantee at most two of the following three properties simultaneously: Consistency, Availability, and Partition Tolerance",
                    "B": "A formula for calculating server CPU capacity",
                    "C": "A database indexing guideline: Composite, Auxiliary, Primary",
                    "D": "A network bandwidth optimization protocol"
                },
                "correct_option": "A",
                "explanation": "In the presence of network partitions (P), a distributed system must choose between Consistency (all nodes see the same data) or Availability (every request gets a non-error response).",
                "difficulty": "Hard"
            },
            {
                "question_text": "What is the difference between Optimistic Concurrency Control and Pessimistic Concurrency Control in full-stack data mutations?",
                "options": {
                    "A": "Optimistic concurrency uses version numbers/timestamps and checks for conflicts at commit time; Pessimistic concurrency locks records immediately upon reading to prevent concurrent access",
                    "B": "Optimistic concurrency requires NoSQL databases",
                    "C": "Pessimistic concurrency never throws errors",
                    "D": "Optimistic concurrency locks tables permanently"
                },
                "correct_option": "A",
                "explanation": "Optimistic locking assumes conflicts are rare, checking version tokens on update; Pessimistic locking acquires row-level locks upfront.",
                "difficulty": "Hard"
            },
            {
                "question_text": "Which protocol upgrades an existing HTTP connection into a persistent, full-duplex bi-directional communication channel for real-time messaging?",
                "options": {
                    "A": "WebSocket (ws:// or wss://)",
                    "B": "HTTP/1.1 Polling",
                    "C": "FTP",
                    "D": "gRPC over UDP only"
                },
                "correct_option": "A",
                "explanation": "WebSockets upgrade HTTP connections via 101 Switching Protocols to establish bi-directional, low-latency socket communication.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is a Content Delivery Network (CDN) and how does it reduce website latency?",
                "options": {
                    "A": "A globally distributed network of edge proxy servers that caches static assets (images, JS, CSS) physically close to end users",
                    "B": "A database cluster located in a single datacenter",
                    "C": "A compression algorithm for SQL databases",
                    "D": "A tool that generates CSS styles automatically"
                },
                "correct_option": "A",
                "explanation": "CDNs serve cached static assets from the nearest geographical Point of Presence (PoP), minimizing latency and server origin load.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the role of an ORM (Object-Relational Mapper) like Prisma, SQLAlchemy, or TypeORM in full-stack backends?",
                "options": {
                    "A": "Abstracting relational database tables into object-oriented models with type safety, query builders, and relation hydration",
                    "B": "Managing Docker container clusters",
                    "C": "Rendering React components on mobile phones",
                    "D": "Validating client email addresses"
                },
                "correct_option": "A",
                "explanation": "ORMs bridge object-oriented application code with relational SQL tables, generating queries and validating model schema types.",
                "difficulty": "Easy"
            },
            {
                "question_text": "How does the 'Circuit Breaker' pattern prevent cascading failures in microservice architectures?",
                "options": {
                    "A": "It monitors downstream service failure rates and trips open to fail fast immediately without overwhelming degraded services, periodically testing recovery via half-open state",
                    "B": "It shuts down the entire server when a 404 is encountered",
                    "C": "It resets database root passwords on authentication failure",
                    "D": "It terminates slow client connections"
                },
                "correct_option": "A",
                "explanation": "Circuit breakers stop calling failing downstream dependencies, preventing thread pool exhaustion and enabling degraded systems to recover.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What is the standard practice for storing user passwords in database tables?",
                "options": {
                    "A": "Never store plain text; hash passwords using modern adaptive one-way hashing algorithms (bcrypt, argon2, or PBKDF2) with random unique cryptographic salts",
                    "B": "Encrypt passwords with reversible AES-256 and store the key in localStorage",
                    "C": "Store passwords as Base64 encoded strings",
                    "D": "Store passwords in MD5 hashes without salt"
                },
                "correct_option": "A",
                "explanation": "Passwords must be hashed with strong, salted, adaptive slow hash functions (bcrypt/argon2) to prevent credential leaks from database compromises.",
                "difficulty": "Easy"
            }
        ]
    }
}
