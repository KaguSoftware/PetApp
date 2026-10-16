const base = {
  preset: "jest-expo",
  // Worklets/Reanimated: resolve the JS (non-.native) implementations under jest.
  resolver: "react-native-worklets/jest/resolver",
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
};

// Two projects: the screens project mocks @/data, expo-router and the native modules (jest.setup.js);
// the unit project keeps the real data layer.
module.exports = {
  projects: [
    {
      ...base,
      displayName: "unit",
      testPathIgnorePatterns: ["/node_modules/", "/supabase/", "/__tests__/screens/"],
    },
    {
      ...base,
      displayName: "screens",
      testMatch: ["<rootDir>/__tests__/screens/**/*.test.[jt]s?(x)"],
      setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
    },
  ],
};
