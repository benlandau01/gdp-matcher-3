import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  Snackbar,
  Alert,
  ThemeProvider,
  createTheme,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import axios from 'axios';

const API_URL = 'http://localhost:5000';

// Create a theme with Inter font
const theme = createTheme({
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h3: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
          fontWeight: 500,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
          fontWeight: 500,
        },
      },
    },
  },
});

function formatGDP(value) {
  if (value >= 1_000_000_000_000) {
    const trillions = value / 1_000_000_000_000;
    return `$${trillions.toPrecision(3)}T`;
  } else if (value >= 1_000_000_000) {
    const billions = value / 1_000_000_000;
    return `$${billions.toPrecision(3)}B`;
  } else if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${millions.toPrecision(3)}M`;
  } else {
    return `$${value.toPrecision(3)}`;
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function App() {
  const [gameData, setGameData] = useState(null);
  const [matches, setMatches] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [error, setError] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [selectedItems, setSelectedItems] = useState({
    countries: null,
    gdps: null,
    flags: null,
    exports: null,
  });
  const [correctMatches, setCorrectMatches] = useState({});
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const handleDifficultyChange = (event, newDifficulty) => {
    if (newDifficulty !== null) {
      setDifficulty(newDifficulty);
      // Reset game state when difficulty changes
      setMatches({});
      setFeedback(null);
      setShowFeedback(false);
      setShowCompletion(false);
      setCorrectMatches({});
      setSelectedItems({
        countries: null,
        gdps: null,
        flags: null,
        exports: null,
      });
      setTimer(0);
      setIsTimerRunning(false);
      setGameStarted(false);
      fetchGameData(newDifficulty);
    }
  };

  const fetchGameData = async (selectedDifficulty = difficulty) => {
    try {
      setError(null);
      const response = await axios.get(`${API_URL}/api/game?difficulty=${selectedDifficulty}`);
      setGameData(response.data);
      setMatches({});
      setFeedback(null);
      setSelectedItems({
        countries: null,
        gdps: null,
        flags: null,
        exports: null,
      });
      setCorrectMatches({});
      setTimer(0);
      setIsTimerRunning(true);
      setGameStarted(true);
    } catch (error) {
      console.error('Error fetching game data:', error);
      setError('Failed to load game data. Please make sure the backend server is running.');
    }
  };

  useEffect(() => {
    fetchGameData();
  }, []);

  const handleItemClick = (type, index) => {
    setSelectedItems(prev => {
      const newSelected = {
        ...prev,
        [type]: prev[type] === index ? null : index
      };
      
      // If we have a complete set of selections, create the match
      if (Object.values(newSelected).every(item => item !== null)) {
        const country = gameData.countries[newSelected.countries];
        const gdp = gameData.gdps[newSelected.gdps];
        const flag = gameData.flags[newSelected.flags];
        const export_item = gameData.exports[newSelected.exports];
        
        setMatches(prevMatches => ({
          ...prevMatches,
          [country]: {
            gdp,
            flag,
            top_export: export_item,
            indices: {
              gdp: newSelected.gdps,
              flag: newSelected.flags,
              export: newSelected.exports
            }
          }
        }));
      }
      
      return newSelected;
    });
  };

  const handleSubmit = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/validate_matches`, {
        matches,
        correct_matches: gameData.correct_matches,
      });
      setFeedback(response.data);
      setShowFeedback(true);

      // Update correct matches for visual feedback
      const newCorrectMatches = { ...correctMatches }; // Preserve existing correct matches
      Object.entries(response.data.feedback).forEach(([country, data]) => {
        if (data.score === 3) { // All matches are correct
          newCorrectMatches[country] = true;
        }
      });
      setCorrectMatches(newCorrectMatches);

      // Check if all matches are correct
      if (Object.keys(newCorrectMatches).length === 5) {
        setShowCompletion(true);
        setIsTimerRunning(false); // Stop the timer when all matches are correct
      }

      // Clear current selections after submission
      setSelectedItems({
        countries: null,
        gdps: null,
        flags: null,
        exports: null,
      });
    } catch (error) {
      console.error('Error submitting matches:', error);
    }
  };

  const handleNewGame = () => {
    setShowCompletion(false);
    fetchGameData();
  };

  const renderColumn = (type, items) => (
    <Box sx={{ minHeight: 400, p: 2 }}>
      {items.map((item, index) => {
        const isSelected = selectedItems[type] === index;
        
        // Determine if this item is part of a correct match
        let isPartOfCorrectMatch = false;
        if (type === 'countries') {
          isPartOfCorrectMatch = correctMatches[item] === true;
        } else {
          // For other columns, check if they're part of any correct match
          Object.entries(correctMatches).forEach(([country, isCorrect]) => {
            if (isCorrect) {
              const correctData = gameData.correct_matches[country];
              const matchData = matches[country];
              if (matchData && matchData.indices) {
                // Check both the value and the index to ensure uniqueness
                if (item === correctData[type === 'gdps' ? 'gdp' : type === 'flags' ? 'flag' : 'top_export'] &&
                    index === matchData.indices[type === 'gdps' ? 'gdp' : type === 'flags' ? 'flag' : 'export']) {
                  isPartOfCorrectMatch = true;
                }
              }
            }
          });
        }
        
        return (
          <Card
            key={`${type}-${index}`}
            onClick={() => !isPartOfCorrectMatch && handleItemClick(type, index)}
            sx={{
              mb: 2,
              cursor: isPartOfCorrectMatch ? 'default' : 'pointer',
              height: '100px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #D0D0D0',
              backgroundColor: isPartOfCorrectMatch ? '#157000' : isSelected ? '#4CAF50' : '#f9f9f9',
              color: isPartOfCorrectMatch ? 'white' : 'inherit',
              '&:hover': {
                boxShadow: isPartOfCorrectMatch ? 0 : 3,
              },
              opacity: isPartOfCorrectMatch ? 1 : 1,
            }}
          >
            <CardContent sx={{ width: '100%', textAlign: 'center' }}>
              {type === 'flags' ? (
                <img
                  src={item}
                  alt="Country flag"
                  style={{
                    width: 'auto',
                    height: '60px',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <Typography
                  sx={{
                    fontSize: type === 'gdps' ? '1.1rem' : type === 'exports' ? '0.6rem' : '1.2rem',
                    fontWeight: type === 'gdps' ? 'bold' : 'normal',
                  }}
                >
                  {type === 'gdps' ? formatGDP(Number(item)) : item}
                </Typography>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );

  if (error) return <Typography color="error">{error}</Typography>;
  if (!gameData) return <Typography>Loading game data...</Typography>;

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography 
            variant="h3" 
            component="h1"
            sx={{ color: 'navy' }}
          >
            GDP Matcher Game
          </Typography>
          {gameStarted && (
            <Typography 
              variant="h4" 
              sx={{ 
                fontFamily: 'monospace',
                color: 'navy',
                fontWeight: 600
              }}
            >
              {formatTime(timer)}
            </Typography>
          )}
        </Box>

        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
          <ToggleButtonGroup
            value={difficulty}
            exclusive
            onChange={handleDifficultyChange}
            aria-label="game difficulty"
          >
            <ToggleButton value="easy" aria-label="easy mode">
              Easy (GDP &gt; $500B)
            </ToggleButton>
            <ToggleButton value="medium" aria-label="medium mode">
              Medium (GDP &gt; $10B)
            </ToggleButton>
            <ToggleButton value="hard" aria-label="hard mode">
              Hard (All Countries)
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Paper elevation={3}>
              <Typography 
                variant="h6" 
                p={2} 
                align="center"
                sx={{ color: '#1695ff' }} // Light blue
              >
                Country
              </Typography>
              {renderColumn('countries', gameData.countries)}
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper elevation={3}>
              <Typography 
                variant="h6" 
                p={2} 
                align="center"
                sx={{ color: '#1695ff' }} // Light blue
              >
                GDP (USD)
              </Typography>
              {renderColumn('gdps', gameData.gdps)}
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper elevation={3}>
              <Typography 
                variant="h6" 
                p={2} 
                align="center"
                sx={{ color: '#1695ff' }} // Light blue
              >
                Flag
              </Typography>
              {renderColumn('flags', gameData.flags)}
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper elevation={3}>
              <Typography 
                variant="h6" 
                p={2} 
                align="center"
                sx={{ color: '#1695ff' }} // Light blue
              >
                Top Export
              </Typography>
              {renderColumn('exports', gameData.exports)}
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={Object.values(selectedItems).some(item => item === null)}
            sx={{ minWidth: '120px' }}
          >
            Submit Matches
          </Button>
          <Button
            variant="outlined"
            onClick={() => fetchGameData()}
            sx={{ minWidth: '120px' }}
          >
            New Game
          </Button>
        </Box>

        <Snackbar
          open={showFeedback}
          autoHideDuration={3000}
          onClose={() => setShowFeedback(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity="success" onClose={() => setShowFeedback(false)}>
            {Object.keys(correctMatches).length}/5 matches correct
          </Alert>
        </Snackbar>

        <Snackbar
          open={showCompletion}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            severity="success" 
            onClose={() => setShowCompletion(false)}
            sx={{ 
              width: '100%',
              '& .MuiAlert-message': {
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }
            }}
          >
            <span>Great job! Do you want to play again?</span>
            <Button 
              variant="contained" 
              size="small" 
              onClick={handleNewGame}
              sx={{ ml: 2 }}
            >
              Play Again
            </Button>
          </Alert>
        </Snackbar>
      </Container>
    </ThemeProvider>
  );
}

export default App; 