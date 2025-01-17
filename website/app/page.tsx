'use client';

import React, { useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Toolbar from '@mui/material/Toolbar';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import CssBaseline from '@mui/material/CssBaseline';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import GitHubIcon from '@mui/icons-material/GitHub';
import ReadMoreIcon from '@mui/icons-material/ReadMore';
import IconButton from '@mui/material/IconButton';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';

interface ProblemSet {
  name: string;
  problemCount: number;
  averageDifficulty: number;
}

interface Problem {
  benchmark: string;
  problemset: string;
  index: number;
  setup: string;
  code: string;
  difficulty: number;
}

interface Result {
  benchmark: string;
  version: number;
  problemset: string;
  index: number;
  agent: string;
  attempt: number;
  verdict: string;
  subverdict: string;
  extended_verdict: string;
  question: string;
  agent_exception: string;
  validator: any[];
  code: string;
}

interface SiteData {
  // Benchmark name to a list of problemsets
  benchmarks: Map<string, ProblemSet[]>;
  // Benchmark name, problemset to a list of problems
  problems: Map<string, Problem[]>;
  // From benchmark, problemset, index to a list of results
  results: Map<string, Result[]>;
}

interface CodeBlockProps {
  language: string;
  code: string;
  title?: string;
  className?: string;
}

function CodeBlock(props: CodeBlockProps) {
  console.log(props);
  return (
    <Box className={props.className}>
      {props.title && <Typography variant='body1'>{props.title}</Typography>}
      <SyntaxHighlighter
        language={props.language}
        wrapLongLines={true}
        className={props.className}
        customStyle={props.title ? { marginTop: 0 } : undefined}
      >
        {props.code}
      </SyntaxHighlighter>
    </Box>
  );
}

const StyledCodeBlock = styled(CodeBlock)(({ theme }) => ({
  '& .MuiTypography-root': {
    fontWeight: 500,
    color: theme.palette.grey[50],
    backgroundColor: theme.palette.grey[600],
    padding: `${theme.spacing(0.5)} ${theme.spacing(2)}`,
  },
  '& pre': {
    padding: `${theme.spacing(1)} ${theme.spacing(2)} !important`,
    lineHeight: `${theme.typography.body2.lineHeight} !important`,
    fontSize: `${theme.typography.body2.fontSize} !important`,
  },
}));

export default function Home() {
  const [data, setData] = useState<SiteData>({
    benchmarks: new Map(),
    problems: new Map(),
    results: new Map(),
  });
  const [visibleProblems, setVisibleProblems] = useState<Problem[]>([]);
  const [resultSet, setResultSet] = useState<Result[] | undefined>(undefined);

  const SEPARATOR = '---';

  useEffect(() => {
    Promise.all([fetch('data/benchmarks.json'), fetch('data/results.json')])
      .then(([res1, res2]) => {
        return Promise.all([res1.json(), res2.json()]);
      })
      .then(([benchmarkData, resultsData]) => {
        const problems = new Map<string, Problem[]>();
        Object.entries(benchmarkData).forEach(([benchmarkName, problemsets]) => {
          (problemsets as Problem[]).forEach((problem) => {
            problems.set(`${benchmarkName}${SEPARATOR}${problem.problemset}`, [
              ...(problems.get(`${benchmarkName}${SEPARATOR}${problem.problemset}`) || []),
              problem,
            ]);
          });
        });

        const benchmarks = new Map<string, ProblemSet[]>();
        Array.from(problems.entries()).forEach(([benchmarkNameAndName, problemList]) => {
          const [benchmarkName, name] = benchmarkNameAndName.split(SEPARATOR);
          const problemCount = problemList.filter((problem) => problem.setup.length > 0).length;
          const averageDifficulty =
            problemList
              .filter((problem) => problem.setup.length > 0)
              .reduce((acc, problem) => acc + problem.difficulty, 0) / problemCount;
          benchmarks.set(benchmarkName, [
            ...(benchmarks.get(benchmarkName) || []),
            {
              name,
              problemCount,
              averageDifficulty,
            },
          ]);
        });

        const results = new Map<string, Result[]>();
        Object.entries(resultsData).forEach(([benchmarkName, resultData]) => {
          (resultData as Result[]).forEach((result) => {
            results.set(
              `${result.benchmark}${SEPARATOR}${result.problemset}${SEPARATOR}${result.index}`,
              [
                ...(results.get(
                  `${result.benchmark}${SEPARATOR}${result.problemset}${SEPARATOR}${result.index}`
                ) || []),
                result,
              ]
            );
          });
        });

        setData({
          benchmarks,
          problems,
          results,
        });
      });
  }, []);

  const handleProblemSetClick = (benchmark: string, problemset: string) => () => {
    const problems = data.problems.get(`${benchmark}${SEPARATOR}${problemset}`)!;
    setVisibleProblems(problems);
  };

  const handleResultButtonClick = (problem: Problem) => () => {
    const results = data.results.get(
      `${problem.benchmark}${SEPARATOR}${problem.problemset}${SEPARATOR}${problem.index}`
    );
    console.log(results);
    if (results) {
      setResultSet(results);
    } else {
      setResultSet([]);
    }
  };

  const fileBrowserWidth = '35vw';
  const resultWidth = '40vw';

  const fileBrowser = (
    <SimpleTreeView sx={{ mt: 2 }}>
      {Array.from(data.benchmarks.entries()).map(([benchmarkName, benchmarkContents], index) => {
        const numProblemsets = benchmarkContents.length;
        const numProblems = benchmarkContents.reduce(
          (acc, problemset) => acc + problemset.problemCount,
          0
        );
        const averageDifficulty =
          benchmarkContents.reduce(
            (acc, problemset) => acc + problemset.averageDifficulty * problemset.problemCount,
            0
          ) / numProblems;
        const itemLabel =
          `${benchmarkName} (${numProblemsets} problemsets, ` +
          `${numProblems} problems, ` +
          `difficulty ${averageDifficulty.toFixed(1)})`;
        return (
          <TreeItem itemId={`benchmark-${index}`} label={itemLabel} key={`benchmark-${index}`}>
            {benchmarkContents.map((problemset, localIndex) => (
              <TreeItem
                itemId={`benchmark-${index}-${localIndex}`}
                label={`${problemset.name} (${
                  problemset.problemCount
                } problems, difficulty ${problemset.averageDifficulty.toFixed(1)})`}
                key={`benchmark-${index}-${localIndex}`}
                onClick={handleProblemSetClick(benchmarkName, problemset.name)}
              />
            ))}
          </TreeItem>
        );
      })}
    </SimpleTreeView>
  );

  const drawer = (
    <Drawer
      open={resultSet !== undefined}
      onClose={() => setResultSet(undefined)}
      sx={{
        width: resultWidth,
        [`& .MuiDrawer-paper`]: { width: resultWidth, boxSizing: 'border-box' },
      }}
    >
      <Toolbar />
      <Box sx={{ mt: 1 }}>
        {resultSet &&
          resultSet.map((result) => {
            let color: 'error' | 'success' | 'warning' = 'error';
            if (result.verdict == 'CORRECT') {
              color = 'success';
            } else if (
              result.verdict == 'INTACT_VIOLATION' ||
              result.verdict == 'PRESENTATION_ERROR'
            ) {
              color = 'warning';
            }
            const displayName = (
              result.verdict +
              (result.subverdict === 'UNCATEGORIZED' ? '' : ' - ' + result.subverdict)
            )
              .replace(/_/g, ' ')
              .toLowerCase()
              .replace(/(^\w{1})|(\s+\w{1})/g, (letter) => letter.toUpperCase());
            return (
              <Box
                sx={{ marginBottom: 2, p: 2 }}
                key={`${result.benchmark}-${result.problemset}-${result.index}-${result.agent}`}
              >
                <Box display='flex'>
                  <Typography variant='h6' sx={{ flexGrow: 1 }}>
                    {result.agent}
                  </Typography>
                  <Chip label={displayName} color={color} sx={{ fontWeight: 'bold' }} />
                </Box>
                <Typography variant='body1' sx={{ fontWeight: 'bold' }}>
                  Generated Code
                </Typography>
                <StyledCodeBlock language='python' code={result.code} />
                {result.extended_verdict && (
                  <Box>
                    <Typography variant='body1' sx={{ fontWeight: 'bold' }}>
                      Validator Summary
                    </Typography>
                    <StyledCodeBlock language='text' code={result.extended_verdict} />
                  </Box>
                )}
              </Box>
            );
          })}
      </Box>
    </Drawer>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position='fixed' sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant='h6' component='div' noWrap sx={{ flexGrow: 1 }}>
            DSEval Online Browser
          </Typography>
          <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
            <IconButton
              size='large'
              href='https://github.com/MetaCopilot/dseval'
              target='_blank'
              color='inherit'
            >
              <GitHubIcon />
            </IconButton>
            <IconButton
              size='large'
              edge='end'
              href='https://arxiv.org/abs/2402.17168'
              color='inherit'
              target='_blank'
            >
              <ReadMoreIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant='permanent'
        sx={{
          width: fileBrowserWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: fileBrowserWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>{fileBrowser}</Box>
      </Drawer>
      <Box component='main' sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {visibleProblems.length > 0 ? (
          <Typography variant='h4' sx={{ mt: 0, mb: 2 }}>
            Problem Set: {visibleProblems[0].problemset}
          </Typography>
        ) : (
          <Typography
            variant='h6'
            sx={{
              fontWeight: 'bold',
              margin: 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minHeight: 'calc(100vh - 200px)',
              textAlign: 'center',
              color: 'gray',
            }}
          >
            Problem set not selected
          </Typography>
        )}
        {visibleProblems.map((problem) => {
          const results =
            data.results.get(
              `${problem.benchmark}${SEPARATOR}${problem.problemset}${SEPARATOR}${problem.index}`
            ) || [];
          const acceptRate =
            results.length > 0
              ? (results.filter((result) => result.verdict === 'CORRECT').length / results.length) *
                100
              : 0;

          return (
            <Box
              sx={{ marginBottom: 3 }}
              key={`${problem.benchmark}-${problem.problemset}-${problem.index}`}
            >
              <Box sx={{ display: 'flex' }}>
                <Typography variant='h6' component='div' sx={{ flexGrow: 1 }}>
                  {problem.setup
                    ? `Problem #${problem.index} (difficulty ${problem.difficulty.toFixed(
                        1
                      )}, accept rate: ${acceptRate.toFixed(1)}%)`
                    : `Preparation Code #${problem.index}`}
                </Typography>
                {problem.setup && (
                  <IconButton aria-label='Leaderboard' onClick={handleResultButtonClick(problem)}>
                    <LeaderboardIcon />
                  </IconButton>
                )}
              </Box>

              {problem.setup ? <StyledCodeBlock code={problem.setup} language='yaml' /> : null}

              <StyledCodeBlock
                language='python'
                code={problem.code}
                title={problem.setup ? 'Answer' : undefined}
              />
            </Box>
          );
        })}
      </Box>
      {drawer}
    </Box>
  );
}
