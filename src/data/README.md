# Quiz App Challenge Data

This directory contains the data files for challenges in Round 3 of the quiz application.

## Files Structure

- `dsaProblems.js`: Contains the problems for the DSA track
- `webChallenges.js`: Contains the challenges for the Web Development track

## How to Customize the Challenges

### DSA Problems (dsaProblems.js)

The DSA problems follow this structure:

```javascript
export const dsaProblems = [
  {
    id: 1, // Unique identifier for the problem
    title: "Problem Title",
    description: "Description of the problem with detailed information",
    examples: [
      {
        input: "Example input",
        output: "Example output",
        explanation: "Optional explanation of the example" // Optional
      }
      // More examples...
    ],
    constraints: [
      "Constraint 1",
      "Constraint 2"
      // More constraints...
    ],
    expectedResultImage: "/path/to/image.png" // Optional
  }
  // More problems...
];
```

### Web Development Challenges (webChallenges.js)

The Web Development challenges follow this structure:

```javascript
export const webChallenges = [
  {
    id: 1, // Unique identifier for the challenge
    title: "Challenge Title",
    description: "Description of the web challenge",
    requirements: [
      "Requirement 1",
      "Requirement 2"
      // More requirements...
    ],
    htmlTemplate: `Initial HTML template code...`,
    cssTemplate: `Initial CSS template code...`,
    jsTemplate: `Initial JavaScript template code...`,
    expectedResultImage: "URL or path to expected result image" // Optional
  }
  // More challenges...
];
```

## Adding New Challenges

To add a new challenge to either track:

1. Open the respective file (`dsaProblems.js` or `webChallenges.js`)
2. Add a new object to the array following the structure above
3. Make sure to assign a unique ID for the new challenge
4. Save the file

## Modifying Existing Challenges

To modify an existing challenge:

1. Open the respective file
2. Find the challenge you want to modify by its ID or title
3. Update the fields you wish to change
4. Save the file

## Important Notes

- Keep the file structure and export syntax intact
- Make sure each challenge has a unique ID
- For DSA problems, ensure examples are clear and constraints are well-defined
- For Web challenges, make sure HTML, CSS, and JS templates are valid and provide good starting points 