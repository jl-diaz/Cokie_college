import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ImageBackground, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';

export default function EasterEggScreen() {
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);

  const [windowDimensions, setWindowDimensions] = useState(Dimensions.get('window'));
  const screenWidth = windowDimensions.width;
  const screenHeight = windowDimensions.height;

  // Actualizar dimensiones si cambia la ventana (útil en web)
  useEffect(() => {
    const onChange = ({ window }) => setWindowDimensions(window);
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  const GRAVITY = 0.5;
  const JUMP = -8;
  const OBSTACLE_WIDTH = 70;
  const OBSTACLE_GAP = 220;
  const OBSTACLE_SPEED = 3.5;
  const BIRD_SIZE = 45;

  const birdY = useRef(screenHeight / 2);
  const birdVelocity = useRef(0);
  const obstacles = useRef([]);
  const requestRef = useRef(null);
  
  // Forzamos renderizado para sincronizar UI con game loop
  const [, forceRender] = useState({});

  const spawnObstacle = (currentWidth, currentHeight) => {
    const minHeight = 80;
    const maxHeight = currentHeight - OBSTACLE_GAP - minHeight;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
    
    obstacles.current.push({
      x: currentWidth,
      topHeight: topHeight,
      bottomHeight: currentHeight - OBSTACLE_GAP - topHeight,
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
    setScore(0);
    birdY.current = screenHeight / 2;
    birdVelocity.current = 0;
    obstacles.current = [];
    spawnObstacle(screenWidth, screenHeight);
  };

  const gameLoop = () => {
    if (isPlaying && !isGameOver) {
      birdVelocity.current += GRAVITY;
      birdY.current += birdVelocity.current;

      for (let i = 0; i < obstacles.current.length; i++) {
        let obs = obstacles.current[i];
        obs.x -= OBSTACLE_SPEED;

        // Collision logic
        const hitTop = birdY.current < obs.topHeight;
        const hitBottom = birdY.current + BIRD_SIZE > screenHeight - obs.bottomHeight;
        const hitX = obs.x < screenWidth / 2 + BIRD_SIZE / 2 && obs.x + OBSTACLE_WIDTH > screenWidth / 2 - BIRD_SIZE / 2;

        if (hitX && (hitTop || hitBottom)) {
          setIsGameOver(true);
        }

        // Score logic
        if (obs.x + OBSTACLE_WIDTH < screenWidth / 2 - BIRD_SIZE / 2 && !obs.passed) {
          setScore((s) => s + 1);
          obs.passed = true;
        }
      }

      if (birdY.current > screenHeight || birdY.current < 0) {
        setIsGameOver(true);
      }

      if (obstacles.current.length > 0 && obstacles.current[0].x < -OBSTACLE_WIDTH) {
        obstacles.current.shift();
      }
      
      const lastObs = obstacles.current[obstacles.current.length - 1];
      if (lastObs && lastObs.x < screenWidth - 280) {
        spawnObstacle(screenWidth, screenHeight);
      }

      // Re-render
      forceRender({});
    }
    requestRef.current = requestAnimationFrame(gameLoop);
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
      <ImageBackground 
        source={require('../src/assets/flappy_bg.jpg')} 
        style={[styles.background, { width: screenWidth, height: screenHeight }]}
        resizeMode="cover"
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Salir</Text>
        </TouchableOpacity>

        {!isPlaying && !isGameOver && (
          <View style={styles.startOverlay}>
            <Text style={styles.startText}>Toca o presiona Espacio para jugar</Text>
          </View>
        )}

        <Text style={styles.scoreText}>{score}</Text>

        {obstacles.current.map((obs, i) => (
          <React.Fragment key={i}>
            <View style={[styles.pipe, styles.pipeTop, { left: obs.x, width: OBSTACLE_WIDTH, height: obs.topHeight }]} />
            <View style={[styles.pipe, styles.pipeBottom, { left: obs.x, width: OBSTACLE_WIDTH, height: obs.bottomHeight, bottom: 0 }]} />
          </React.Fragment>
        ))}

        <Image 
          source={require('../src/assets/dogy.png')} 
          style={[styles.bird, { 
            top: birdY.current, 
            left: screenWidth / 2 - BIRD_SIZE / 2, 
            width: BIRD_SIZE, 
            height: BIRD_SIZE,
            transform: [{ rotate: `${Math.min(Math.max(birdVelocity.current * 3, -30), 90)}deg` }]
          }]} 
        />

        {isGameOver && (
          <View style={styles.gameOverOverlay}>
            <Text style={styles.gameOverText}>¡Ups!</Text>
            <Text style={styles.finalScoreText}>Puntaje: {score}</Text>
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
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    zIndex: 10
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
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
    top: 80,
    alignSelf: 'center',
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'black',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
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
    marginBottom: 10,
  },
  finalScoreText: {
    fontSize: 24,
    color: 'white',
    marginBottom: 30,
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
