export function readFlag(argv, name, options = {}) {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  const value = argv[index + 1];
  if (value === undefined || (!options.allowLeadingDashValue && value.startsWith("--"))) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

export function hasFlag(argv, name) {
  return argv.includes(name);
}

export async function readStdin(stdin) {
  return new Promise((resolve, reject) => {
    let data = "";
    stdin.setEncoding("utf8");
    stdin.on("data", (chunk) => {
      data += chunk;
    });
    stdin.once("error", reject);
    stdin.once("end", () => resolve(data));
  });
}

export function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
