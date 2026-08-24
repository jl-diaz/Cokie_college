import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ImageBackground, Image, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../src/utils/supabase';
import { useAuth } from '../src/context/AuthContext';

export default function EasterEggScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [highScore, setHighScore] = useState(0);
  const [globalRecord, setGlobalRecord] = useState(0); 
  const [globalRecordHolder, setGlobalRecordHolder] = useState('Anónimo');
  const [newRecordType, setNewRecordType] = useState(null);

  const [windowDimensions, setWindowDimensions] = useState(Dimensions.get('window'));
  const screenWidth = windowDimensions.width;
  const screenHeight = windowDimensions.height;

  // Load initial records
  useEffect(() => {
    const loadRecords = async () => {
      try {
        const localScore = await AsyncStorage.getItem('flappyHighScore');
        if (localScore !== null) {
          setHighScore(parseInt(localScore, 10));
        }
        
        // Attempt to fetch global record (fails silently if table doesn't exist)
        const { data, error } = await supabase
          .from('flappy_scores')
          .select('score, user_name')
          .order('score', { ascending: false })
          .limit(1);
          
        if (!error && data && data.length > 0) {
          setGlobalRecord(data[0].score);
          setGlobalRecordHolder(data[0].user_name || 'Anónimo');
        }
      } catch (e) {
        console.warn('Error loading records', e);
      }
    };
    loadRecords();
  }, []);

  // Actualizar dimensiones si cambia la ventana (útil en web)
  useEffect(() => {
    const onChange = ({ window }) => setWindowDimensions(window);
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  const GRAVITY = 0.35;
  const JUMP = -6.5;
  const OBSTACLE_WIDTH = 70;
  const OBSTACLE_SPEED = 3.5;
  const BIRD_WIDTH = 55;
  const BIRD_HEIGHT = 45;
  const HITBOX_MARGIN = 12;

  const birdY = useRef(screenHeight / 2);
  const birdVelocity = useRef(0);
  const obstacles = useRef([]);
  const requestRef = useRef(null);
  const lastTimeRef = useRef(0);
  
  // Forzamos renderizado para sincronizar UI con game loop
  const [, forceRender] = useState({});

  const spawnObstacle = (currentWidth, currentHeight) => {
    const currentGap = Math.min(250, currentHeight * 0.35);
    const minHeight = Math.min(80, currentHeight * 0.15);
    const maxHeight = currentHeight - currentGap - minHeight;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
    
    obstacles.current.push({
      x: currentWidth,
      topHeight: topHeight,
      gap: currentGap,
      passed: false
    });
  };

  const jump = () => {
    if (!isPlaying && !isGameOver) {
      setIsPlaying(true);
      obstacles.current = [];
      spawnObstacle(screenWidth, screenHeight);
    }
    if (isGameOver) {
      resetGame();
    } else {
      birdVelocity.current = JUMP;
    }
  };

  const resetGame = () => {
    setIsGameOver(false);
    setIsPlaying(true);
    scoreRef.current = 0;
    setScore(0);
    setNewRecordType(null);
    birdY.current = screenHeight / 2;
    birdVelocity.current = 0;
    obstacles.current = [];
    lastTimeRef.current = 0;
    spawnObstacle(screenWidth, screenHeight);
  };

  const gameLoop = (timestamp) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    let timeScale = deltaTime / 16.666;
    if (timeScale > 3) timeScale = 3;
    if (timeScale < 0.1) timeScale = 0.1;
    if (isNaN(timeScale)) timeScale = 1;

    if (isPlaying && !isGameOver) {
      birdVelocity.current += GRAVITY * timeScale;
      birdY.current += birdVelocity.current * timeScale;

      for (let i = 0; i < obstacles.current.length; i++) {
        let obs = obstacles.current[i];
        obs.x -= OBSTACLE_SPEED * timeScale;

        // Collision logic with margin of error
        const hitTop = birdY.current + HITBOX_MARGIN < obs.topHeight;
        const hitBottom = birdY.current + BIRD_HEIGHT - HITBOX_MARGIN > obs.topHeight + obs.gap;
        const hitX = obs.x < screenWidth / 2 + BIRD_WIDTH / 2 - HITBOX_MARGIN && obs.x + OBSTACLE_WIDTH > screenWidth / 2 - BIRD_WIDTH / 2 + HITBOX_MARGIN;

        if (hitX && (hitTop || hitBottom)) {
          triggerGameOver();
        }

        // Score logic
        if (obs.x + OBSTACLE_WIDTH < screenWidth / 2 - BIRD_WIDTH / 2 && !obs.passed) {
          scoreRef.current += 1;
          setScore(scoreRef.current);
          obs.passed = true;
        }
      }

      if (birdY.current > screenHeight || birdY.current < 0) {
        triggerGameOver();
      }

      if (obstacles.current.length > 0 && obstacles.current[0].x < -OBSTACLE_WIDTH) {
        obstacles.current.shift();
      }
      
      const lastObs = obstacles.current[obstacles.current.length - 1];
      if (lastObs && lastObs.x < screenWidth - 250) {
        spawnObstacle(screenWidth, screenHeight);
      }

      // Re-render
      forceRender({});
    }
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const triggerGameOver = async () => {
    setIsGameOver(true);
    let isNewGlobal = false;
    let isNewPersonal = false;
    const finalScore = scoreRef.current;

    if (finalScore > globalRecord) {
      isNewGlobal = true;
      setGlobalRecord(finalScore);
      setGlobalRecordHolder(profile?.full_name?.split(' ')[0] || 'Anónimo');
    }
    
    if (finalScore > highScore) {
      isNewPersonal = true;
      setHighScore(finalScore);
      try {
        await AsyncStorage.setItem('flappyHighScore', finalScore.toString());
      } catch (e) {}
    }

    if (isNewGlobal) {
      setNewRecordType('global');
      try {
        const userName = profile?.full_name?.split(' ')[0] || 'Anónimo';
        await supabase.from('flappy_scores').insert([{ score: finalScore, user_name: userName }]);
      } catch (e) {}
    } else if (isNewPersonal) {
      setNewRecordType('personal');
    }
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, isGameOver, screenWidth, screenHeight]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleKeyDown = (e) => {
        if (e.code === 'Space') {
          e.preventDefault();
          jump();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isPlaying, isGameOver, screenWidth, screenHeight]);

  return (
    <TouchableOpacity activeOpacity={1} style={styles.container} onPress={jump}>
      <Stack.Screen options={{ title: '', headerTransparent: true }} />
      <ImageBackground 
        source={require('../src/assets/flappy_bg.jpg')} 
        style={[styles.background, { width: screenWidth, height: screenHeight }]}
        resizeMode="cover"
      >
        {!isPlaying && !isGameOver && (
          <View style={styles.startOverlay}>
            <Text style={styles.startText}>Toca o presiona Espacio para jugar</Text>
          </View>
        )}

        <Text style={styles.scoreText}>{score}</Text>

        {obstacles.current.map((obs, i) => {
          const bottomHeight = Math.max(0, screenHeight - obs.topHeight - obs.gap);
          return (
            <React.Fragment key={i}>
              <View style={[styles.pipe, styles.pipeTop, { left: obs.x, width: OBSTACLE_WIDTH, height: obs.topHeight }]} />
              <View style={[styles.pipe, styles.pipeBottom, { left: obs.x, width: OBSTACLE_WIDTH, height: bottomHeight, bottom: 0 }]} />
            </React.Fragment>
          );
        })}

        <Image 
          source={require('../src/assets/CokieMan.png')} 
          style={[styles.bird, { 
            top: birdY.current, 
            left: screenWidth / 2 - BIRD_WIDTH / 2, 
            width: BIRD_WIDTH, 
            height: BIRD_HEIGHT,
            transform: [{ rotate: `${Math.min(Math.max(birdVelocity.current * 3, -30), 90)}deg` }]
          }]} 
        />

        {isGameOver && (
          <View style={styles.gameOverOverlay}>
            <Text style={styles.gameOverText}>¡Ups!</Text>
            
            {newRecordType === 'global' && (
              <View style={[styles.congratsBadge, { backgroundColor: '#10b981' }]}>
                <Text style={styles.congratsText}>👑 ¡NUEVO RÉCORD GLOBAL! 👑</Text>
              </View>
            )}
            
            {newRecordType === 'personal' && (
              <View style={[styles.congratsBadge, { backgroundColor: '#F6BE2F' }]}>
                <Text style={[styles.congratsText, { color: '#0B1956' }]}>🌟 ¡RÉCORD PERSONAL! 🌟</Text>
              </View>
            )}

            <View style={styles.scoreBoard}>
              <Text style={styles.finalScoreText}>Puntaje: {score}</Text>
              <Text style={styles.recordText}>Récord Personal: {highScore}</Text>
              {globalRecord > 0 && (
                <Text style={styles.recordTextGlobal}>
                  Récord Global Semanal: {Math.max(globalRecord, score, highScore)} ({globalRecordHolder})
                </Text>
              )}
            </View>
            <TouchableOpacity style={styles.retryButton} onPress={resetGame}>
              <Text style={styles.retryButtonText}>Jugar de nuevo</Text>
            </TouchableOpacity>
          </View>
        )}
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    overflow: 'hidden'
  },
  bird: {
    position: 'absolute',
    resizeMode: 'contain',
  },
  pipe: {
    position: 'absolute',
    backgroundColor: '#73bf2e',
    borderColor: '#558c22',
    borderWidth: 3,
    borderRadius: 8,
  },
  pipeTop: {
    top: 0,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  pipeBottom: {
    bottom: 0,
    borderBottomWidth: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  scoreText: {
    position: 'absolute',
    top: 130, // Bajado para evitar la dynamic island
    alignSelf: 'center',
    fontSize: 56,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'black',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 6,
    zIndex: 10,
  },
  startOverlay: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 20,
    borderRadius: 16,
  },
  startText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  gameOverText: {
    fontSize: 50,
    fontWeight: '900',
    color: 'white',
    marginBottom: 15,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  congratsBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  congratsText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 16,
  },
  scoreBoard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  finalScoreText: {
    fontSize: 32,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  recordText: {
    fontSize: 18,
    color: '#F6BE2F',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recordTextGlobal: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: '#F6BE2F',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#0B1956',
    fontWeight: 'bold',
    fontSize: 18,
  }
});
