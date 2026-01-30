import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import {
  Box,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Slider,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { OrbitControls, Text, Billboard } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Matrix } from 'ml-matrix';
import { PCA } from 'ml-pca';
import React, { useState, Suspense, useRef } from 'react';
import * as THREE from 'three';

import { useAuth } from '~/firebase/auth-provider';
import { api } from '~/utils/api-client';

import type { colorPointsType, colorPointType } from '../types/color-points';

type ColorGroup = {
  id: string;
  name: string;
  pointIndices: number[];
  ringColor: string;
  createdAt: Date;
};

type Product = {
  product_id: string;
  product_brand_name: string;
  product_description: string;
  product_color_swatch: string;
  product_image: string;
  product_link: string;
  price: string;
  type: string;
  match_percentage: string;
  color_distance: number;
  erp_connection: boolean;
  instore_status: boolean;
  online_status: boolean;
  stock_level: number;
  store_brand: string;
  color_lab: [number, number, number];
  color_hex: string;
  corrected_color_lab?: [number, number, number];
  history: Record<string, any>;
};

type ProductMatchRequest = {
  store_name: string;
  store_location: string;
  length: number;
  target_color: [number, number, number];
  include_scanning_history?: boolean;
};

type ProductMatchResponse = {
  products: Product[];
};

// API function to fetch product matches
const fetchProductMatches = async (
  request: ProductMatchRequest,
  token?: string,
): Promise<ProductMatchResponse> => {
  return api.post<ProductMatchResponse>(
    '/get_results_without_saving',
    request,
    { token },
  );
};

// Get color based on distance for product highlighting
const getDistanceColor = (distance: number): string => {
  if (distance <= 2) return '#4caf50'; // Green
  if (distance <= 4) return '#ffeb3b'; // Yellow
  if (distance <= 6) return '#ff9800'; // Orange
  if (distance <= 8) return '#f44336'; // Red
  return '#b71c1c'; // Dark red
};

// History Line Component for multiple segments
function HistoryLines({
  segments,
}: {
  segments: THREE.Vector3[][];
  globalScale: number;
}) {
  if (segments.length === 0) return null;

  return (
    <>
      {segments.map((points, index) => {
        if (points.length < 2) return null;
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return (
          <line key={index}>
            <primitive object={geometry} attach="geometry" />
            <lineBasicMaterial color="#ff6b35" transparent opacity={0.8} />
          </line>
        );
      })}
    </>
  );
}

// Single History Line Component (for individual product)
function HistoryLine({
  points,
}: {
  points: THREE.Vector3[];
  globalScale: number;
}) {
  const lineRef = useRef<THREE.Line>(null!);

  if (points.length < 2) return null;

  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <line ref={lineRef}>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial color="#ff6b35" transparent opacity={0.8} />
    </line>
  );
}

// Individual Color Point Sphere Component
function ColorPoint({
  point,
  isSelected,
  onClick,
  isAverage = false,
  groupRingColor = null,
  globalScale,
  isProduct = false,
  productDistance,
}: {
  point: colorPointType;
  isSelected: boolean;
  onClick: () => void;
  isAverage?: boolean;
  groupRingColor?: string | null;
  globalScale: number;
  isProduct?: boolean;
  productDistance?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);

  // Normalize CIE Lab coordinates to 3D space
  // L: 0-100 -> -5 to 5
  // a: -128 to +127 -> -6.375 to 6.375
  // b: -128 to +127 -> -6.375 to 6.375
  const position: [number, number, number] = [
    point.position.a / 20, // x-axis: a component
    point.position.L / 10 - 5, // y-axis: L component (shifted down)
    point.position.b / 20, // z-axis: b component
  ];

  // Convert hex color to RGB for Three.js
  const color = new THREE.Color(point.color);

  // Animate selected points
  useFrame((state) => {
    if (isSelected && meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 2;
      meshRef.current.rotation.y = state.clock.elapsedTime * 2;
    }
  });

  return (
    <group position={position} onClick={onClick}>
      {isAverage ? (
        /* Average Point - Cross Shape */
        <>
          {/* X-axis bar */}
          <mesh>
            <boxGeometry
              args={[0.4 * globalScale, 0.05 * globalScale, 0.05 * globalScale]}
            />
            <meshStandardMaterial
              color={color}
              emissive={color.clone().multiplyScalar(0.3)}
            />
          </mesh>
          {/* Y-axis bar */}
          <mesh>
            <boxGeometry
              args={[0.05 * globalScale, 0.4 * globalScale, 0.05 * globalScale]}
            />
            <meshStandardMaterial
              color={color}
              emissive={color.clone().multiplyScalar(0.3)}
            />
          </mesh>
          {/* Z-axis bar */}
          <mesh>
            <boxGeometry
              args={[0.05 * globalScale, 0.05 * globalScale, 0.4 * globalScale]}
            />
            <meshStandardMaterial
              color={color}
              emissive={color.clone().multiplyScalar(0.3)}
            />
          </mesh>
          {/* Central sphere */}
          <mesh>
            <sphereGeometry args={[0.08 * globalScale, 8, 8]} />
            <meshStandardMaterial
              color={color}
              emissive={color.clone().multiplyScalar(0.5)}
              roughness={0.1}
              metalness={0.3}
            />
          </mesh>
        </>
      ) : (
        /* Regular Point - Sphere */
        <mesh ref={meshRef} scale={isSelected ? 1.2 : 1}>
          <sphereGeometry args={[0.15 * globalScale, 16, 16]} />
          <meshStandardMaterial
            color={color}
            emissive={color.clone().multiplyScalar(isSelected ? 0.4 : 0.2)}
            roughness={0.3}
            metalness={0.1}
          />
        </mesh>
      )}
      {/* Group ring - always visible if point belongs to a group */}
      {groupRingColor && (
        <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
          <mesh>
            <ringGeometry args={[0.18 * globalScale, 0.22 * globalScale, 32]} />
            <meshBasicMaterial
              color={groupRingColor}
              transparent={true}
              opacity={0.7}
              side={2}
            />
          </mesh>
        </Billboard>
      )}

      {/* Product distance ring - shows match quality for product points */}
      {isProduct && productDistance !== undefined && (
        <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
          <mesh>
            <ringGeometry args={[0.25 * globalScale, 0.3 * globalScale, 32]} />
            <meshBasicMaterial
              color={getDistanceColor(productDistance)}
              transparent={true}
              opacity={0.8}
              side={2}
            />
          </mesh>
        </Billboard>
      )}

      {/* Selection outline - Billboard ring that always faces camera */}
      {isSelected && (
        <>
          {/* Camera-facing selection ring */}
          <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
            <mesh>
              <ringGeometry
                args={[0.2 * globalScale, 0.25 * globalScale, 32]}
              />
              <meshBasicMaterial
                color="#1976d2"
                transparent={true}
                opacity={0.9}
                side={2}
              />
            </mesh>
          </Billboard>

          {/* Outer pulsing ring for extra visibility */}
          <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
            <mesh>
              <ringGeometry
                args={[0.27 * globalScale, 0.32 * globalScale, 32]}
              />
              <meshBasicMaterial
                color="#1976d2"
                transparent={true}
                opacity={0.4}
                side={2}
              />
            </mesh>
          </Billboard>

          {/* Description label */}
          <Text
            position={[0, 0.4, 0]}
            fontSize={0.12}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {point.description}
          </Text>
        </>
      )}
    </group>
  );
}

// Coordinate System Axes
function CoordinateAxes() {
  return (
    <group>
      {/* X-axis (a component) - Red */}
      <mesh position={[0, -5, 0]}>
        <boxGeometry args={[12, 0.02, 0.02]} />
        <meshBasicMaterial color="red" />
      </mesh>
      <Text position={[6.5, -5, 0]} fontSize={0.2} color="red">
        +a
      </Text>
      <Text position={[-6.5, -5, 0]} fontSize={0.2} color="red">
        -a
      </Text>

      {/* Y-axis (L component) - Green */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.02, 10, 0.02]} />
        <meshBasicMaterial color="green" />
      </mesh>
      <Text position={[0, 5.5, 0]} fontSize={0.2} color="green">
        L=100
      </Text>
      <Text position={[0, -5.5, 0]} fontSize={0.2} color="green">
        L=0
      </Text>

      {/* Z-axis (b component) - Blue */}
      <mesh position={[0, -5, 0]}>
        <boxGeometry args={[0.02, 0.02, 12]} />
        <meshBasicMaterial color="blue" />
      </mesh>
      <Text position={[0, -5, 6.5]} fontSize={0.2} color="blue">
        +b
      </Text>
      <Text position={[0, -5, -6.5]} fontSize={0.2} color="blue">
        -b
      </Text>
    </group>
  );
}

// Selection Box Component
function SelectionBox({
  selectionBox,
}: {
  selectionBox: {
    min: { L: number; a: number; b: number };
    max: { L: number; a: number; b: number };
  };
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Transform coordinates to match ColorPoint positioning
  const minX = selectionBox.min.a / 20;
  const maxX = selectionBox.max.a / 20;
  const minY = selectionBox.min.L / 10 - 5;
  const maxY = selectionBox.max.L / 10 - 5;
  const minZ = selectionBox.min.b / 20;
  const maxZ = selectionBox.max.b / 20;

  const width = maxX - minX;
  const height = maxY - minY;
  const depth = maxZ - minZ;

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;

  console.log('SelectionBox rendering with:', {
    selectionBox,
    width,
    height,
    depth,
    center: [centerX, centerY, centerZ],
  });

  return (
    <mesh ref={meshRef} position={[centerX, centerY, centerZ]}>
      <boxGeometry args={[width, height, depth]} />
      <meshBasicMaterial
        color="#ff0000"
        transparent
        opacity={0.5}
        wireframe={false}
      />
      {/* Wireframe outline */}
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshBasicMaterial
          color="#ffff00"
          transparent
          opacity={1.0}
          wireframe={true}
        />
      </mesh>
    </mesh>
  );
}

// PCA Axes Component
function PCAAxes({
  pcaResults,
}: {
  pcaResults: {
    center: { L: number; a: number; b: number };
    components: Array<{
      L: number;
      a: number;
      b: number;
      eigenvalue: number;
      variance: number;
    }>;
    variance: number[];
    totalVariance: number;
    totalVarianceExplained: number;
    eigenvalues: number[];
    explainedVariance: number[];
  };
}) {
  console.log('PCAAxes rendering with pcaResults:', pcaResults);
  // Transform center to 3D coordinates (same as ColorPoint)
  const centerPos = [
    pcaResults.center.a / 20,
    pcaResults.center.L / 10 - 5,
    pcaResults.center.b / 20,
  ];

  const baseAxisLength = 2; // Base length of PCA axes
  const colors = ['#ff0000', '#00ff00', '#0000ff']; // Red, Green, Blue for PC1, PC2, PC3

  return (
    <group>
      {/* Center point */}
      <mesh position={centerPos}>
        <sphereGeometry args={[0.15]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* PCA Axes */}
      {pcaResults.components.map((component, index) => {
        // Scale axis length by eigenvalue (variance)
        const axisLength = baseAxisLength * 2; // Make axes more visible

        // The component values are already the direction vectors (eigenvectors)
        const direction = [
          component.a, // a component (x-axis)
          component.L, // L component (y-axis)
          component.b, // b component (z-axis)
        ];

        // Normalize and scale the direction vector
        const length = Math.sqrt(
          direction[0] ** 2 + direction[1] ** 2 + direction[2] ** 2,
        );

        // Apply coordinate transformation - make axes more visible
        const normalizedDir = [
          ((direction[0] / length) * axisLength) / 10, // Larger scale for visibility
          ((direction[1] / length) * axisLength) / 5, // Larger scale for visibility
          ((direction[2] / length) * axisLength) / 10, // Larger scale for visibility
        ];

        // Calculate both ends of the axis (bidirectional)
        const endPos1 = [
          centerPos[0] + normalizedDir[0],
          centerPos[1] + normalizedDir[1],
          centerPos[2] + normalizedDir[2],
        ];

        const endPos2 = [
          centerPos[0] - normalizedDir[0],
          centerPos[1] - normalizedDir[1],
          centerPos[2] - normalizedDir[2],
        ];

        // Create proper 3D rotation using quaternion
        const axisVector = new THREE.Vector3(
          normalizedDir[0],
          normalizedDir[1],
          normalizedDir[2],
        );
        const upVector = new THREE.Vector3(0, 1, 0); // Cylinder's default orientation
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(upVector, axisVector.normalize());

        return (
          <group key={index}>
            {/* Axis line using cylinders for better visibility */}
            <mesh position={centerPos} quaternion={quaternion}>
              <cylinderGeometry args={[0.02, 0.02, (axisLength * 2) / 5]} />
              <meshBasicMaterial color={colors[index]} />
            </mesh>

            {/* End points */}
            <mesh position={endPos1}>
              <sphereGeometry args={[0.08]} />
              <meshBasicMaterial color={colors[index]} />
            </mesh>
            <mesh position={endPos2}>
              <sphereGeometry args={[0.08]} />
              <meshBasicMaterial color={colors[index]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// Main 3D Scene Component
function ColorSpace3D({
  points,
  selectedIndices,
  onPointSelect,
  averagePoint,
  getPointRingColor,
  globalScale,
  hiddenIndices,
  productPoints,
  productDistances,
  onProductClick,
  historyPoints,
  historyLinePoints,
  showAllHistory,
  historyLineSegments,
  selectionBox,
  pcaResults,
  showPCAAxes,
}: {
  points: colorPointType[];
  selectedIndices: number[];
  onPointSelect?: (index: number) => void;
  averagePoint?: colorPointType | null;
  getPointRingColor?: (index: number) => string | null;
  globalScale: number;
  hiddenIndices: number[];
  productPoints?: colorPointType[];
  productDistances?: number[];
  onProductClick?: (index: number) => void;
  historyPoints?: colorPointType[];
  historyLinePoints?: THREE.Vector3[];
  showAllHistory?: boolean;
  historyLineSegments?: THREE.Vector3[][];
  selectionBox?: {
    min: { L: number; a: number; b: number };
    max: { L: number; a: number; b: number };
  } | null;
  pcaResults?: {
    center: { L: number; a: number; b: number };
    components: Array<{
      L: number;
      a: number;
      b: number;
      eigenvalue: number;
      variance: number;
    }>;
    variance: number[];
    totalVariance: number;
    totalVarianceExplained: number;
    eigenvalues: number[];
    explainedVariance: number[];
  } | null;
  showPCAAxes?: boolean;
}) {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        border: '1px solid #ddd',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      <Canvas
        camera={{ position: [10, 5, 10], fov: 60 }}
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(to bottom, #f0f8ff 0%, #e6f3ff 100%)',
        }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <pointLight position={[-10, -10, -5]} intensity={0.3} />
        {/* Coordinate System */}
        <CoordinateAxes />
        {/* Color Points */}
        {points.map((point, index) => {
          if (hiddenIndices.includes(index)) return null;
          return (
            <ColorPoint
              key={index}
              point={point}
              isSelected={selectedIndices.includes(index)}
              onClick={() => onPointSelect?.(index)}
              groupRingColor={getPointRingColor?.(index)}
              globalScale={globalScale}
            />
          );
        })}
        {/* Product Points Display */}
        {/* Product Points Display */}
        {productPoints &&
          productPoints.map((productPoint, index) => (
            <ColorPoint
              key={`product_${index}`}
              point={productPoint}
              isSelected={false}
              onClick={() => onProductClick?.(index)}
              globalScale={globalScale}
              isProduct={true}
              productDistance={productDistances?.[index]}
            />
          ))}

        {/* History Points Display */}
        {historyPoints &&
          historyPoints.map((historyPoint, index) => (
            <ColorPoint
              key={`history_${index}`}
              point={historyPoint}
              isSelected={false}
              onClick={() => {}}
              globalScale={globalScale * 0.8} // Slightly smaller than regular points
              isProduct={false}
              groupRingColor="#9e9e9e" // Grey ring for all history points
            />
          ))}

        {/* History Connection Line */}
        {/* Single product history line */}
        {historyLinePoints &&
          historyLinePoints.length > 1 &&
          !showAllHistory && (
            <HistoryLine points={historyLinePoints} globalScale={globalScale} />
          )}

        {/* Multiple products history lines */}
        {showAllHistory && historyLineSegments.length > 0 && (
          <HistoryLines
            segments={historyLineSegments}
            globalScale={globalScale}
          />
        )}

        {/* Average Point Display */}
        {averagePoint && (
          <ColorPoint
            key="average"
            point={averagePoint}
            isSelected={false}
            onClick={() => {}}
            isAverage={true}
            globalScale={globalScale}
          />
        )}

        {/* Selection Box Display */}
        {selectionBox && <SelectionBox selectionBox={selectionBox} />}

        {/* PCA Axes Display */}
        {showPCAAxes && pcaResults && <PCAAxes pcaResults={pcaResults} />}

        {/* Camera Controls */}
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
    </Box>
  );
}

// 2D Fallback Visualization
function ColorSpace2D({
  points,
  selectedIndices,
  onPointSelect,
  hiddenIndices,
}: {
  points: colorPointType[];
  selectedIndices: number[];
  onPointSelect?: (index: number) => void;
  hiddenIndices: number[];
}) {
  const [viewMode, setViewMode] = useState<'L-a' | 'L-b' | 'a-b'>('L-a');

  const getCoordinates = (point: colorPointType) => {
    switch (viewMode) {
      case 'L-a':
        return {
          x: point.position.a,
          y: point.position.L,
          xLabel: 'a (-128 to +127)',
          yLabel: 'L (0-100)',
        };
      case 'L-b':
        return {
          x: point.position.b,
          y: point.position.L,
          xLabel: 'b (-128 to +127)',
          yLabel: 'L (0-100)',
        };
      case 'a-b':
        return {
          x: point.position.a,
          y: point.position.b,
          xLabel: 'a (-128 to +127)',
          yLabel: 'b (-128 to +127)',
        };
    }
  };

  const normalizeCoordinate = (value: number, isL: boolean = false) => {
    if (isL) {
      return (value / 100) * 400 + 50; // L: 0-100 -> 50-450px
    } else {
      return ((value + 128) / 256) * 400 + 50; // a,b: -128 to +127 -> 50-450px
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>View Mode</InputLabel>
          <Select
            value={viewMode}
            onChange={(e) =>
              setViewMode(e.target.value as 'L-a' | 'L-b' | 'a-b')
            }
            label="View Mode"
          >
            <MenuItem value="L-a">L vs a</MenuItem>
            <MenuItem value="L-b">L vs b</MenuItem>
            <MenuItem value="a-b">a vs b</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="caption" color="text.secondary">
          2D projection of CIE Lab color space
        </Typography>
      </Box>

      <Box
        sx={{
          position: 'relative',
          width: 500,
          height: 500,
          border: '1px solid #ddd',
          backgroundColor: '#fafafa',
          margin: '0 auto',
        }}
      >
        {/* Axes */}
        <Box
          sx={{
            position: 'absolute',
            left: 50,
            top: 0,
            width: 1,
            height: '100%',
            backgroundColor: '#999',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            bottom: 50,
            width: '100%',
            height: 1,
            backgroundColor: '#999',
          }}
        />

        {/* Axis labels */}
        {points.length > 0 && (
          <>
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                bottom: 10,
                right: 10,
                color: 'text.secondary',
              }}
            >
              {getCoordinates(points[0]).xLabel}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                top: 10,
                left: 10,
                color: 'text.secondary',
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
              }}
            >
              {getCoordinates(points[0]).yLabel}
            </Typography>
          </>
        )}

        {/* Data points */}
        {points.map((point, index) => {
          if (hiddenIndices.includes(index)) return null;

          const coords = getCoordinates(point);
          const x = normalizeCoordinate(coords.x, false);
          const y = 500 - normalizeCoordinate(coords.y, viewMode.includes('L'));
          const isSelected = selectedIndices.includes(index);

          return (
            <Box
              key={index}
              onClick={() => onPointSelect?.(index)}
              sx={{
                position: 'absolute',
                left: x - (isSelected ? 10 : 8),
                top: y - (isSelected ? 10 : 8),
                width: isSelected ? 20 : 16,
                height: isSelected ? 20 : 16,
                backgroundColor: point.color,
                border: isSelected ? '3px solid #1976d2' : '1px solid #666',
                borderRadius: '50%',
                cursor: 'pointer',
                boxShadow: isSelected
                  ? '0 0 12px rgba(25, 118, 210, 0.6)'
                  : '0 2px 4px rgba(0,0,0,0.2)',
                transition: 'all 0.2s ease',
                zIndex: isSelected ? 10 : 1,
                '&:hover': {
                  transform: 'scale(1.2)',
                  boxShadow: '0 0 12px rgba(25, 118, 210, 0.4)',
                  zIndex: 5,
                },
              }}
              title={`${point.description}: L=${point.position.L.toFixed(1)}, a=${point.position.a.toFixed(1)}, b=${point.position.b.toFixed(1)}`}
            />
          );
        })}
      </Box>
    </Box>
  );
}

export function ColorPointsDisplay(colorPointsFull: colorPointsType) {
  const { token } = useAuth();
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [use3D, setUse3D] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(500);
  const [windowStart, setWindowStart] = useState(0);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [averagePointName, setAveragePointName] = useState('');
  const [colorGroups, setColorGroups] = useState<ColorGroup[]>([]);
  const [saveGroupDialogOpen, setSaveGroupDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupRingColor, setGroupRingColor] = useState('#1976d2');
  const [showGroupsList, setShowGroupsList] = useState(false);
  const [globalScale, setGlobalScale] = useState(0.5);
  const [hiddenIndices, setHiddenIndices] = useState<number[]>([]);

  // Layout state for resizable panels
  const [leftPanelWidth, setLeftPanelWidth] = useState(70); // Percentage of total width
  const [isDragging, setIsDragging] = useState(false);

  // Smart scrollbar state and refs
  const pointsScrollRef = React.useRef<HTMLDivElement>(null);
  const productsScrollRef = React.useRef<HTMLDivElement>(null);
  const [pointsScrollHeight, setPointsScrollHeight] = useState(0);
  const [pointsScrollTop, setPointsScrollTop] = useState(0);
  const [productsScrollHeight, setProductsScrollHeight] = useState(0);
  const [productsScrollTop, setProductsScrollTop] = useState(0);

  // Product matching state
  const [products, setProducts] = useState<Product[]>([]);
  const [productPoints, setProductPoints] = useState<colorPointType[]>([]);
  const [productDistances, setProductDistances] = useState<number[]>([]);
  const [showProductsList, setShowProductsList] = useState(false);
  const [storeLocation, setStoreLocation] = useState('D522');
  const [resultsLength, setResultsLength] = useState(5);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  // Product filter state
  const [rescannedFilter, setRescannedFilter] = useState<string>('all');
  const [selectedProductType, setSelectedProductType] = useState<string>('all');
  const [availableProductTypes, setAvailableProductTypes] = useState<string[]>(
    [],
  );
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);

  // Product history state
  const [selectedProductIndex, setSelectedProductIndex] = useState<
    number | null
  >(null);
  const [historyPoints, setHistoryPoints] = useState<colorPointType[]>([]);
  const [historyLinePoints, setHistoryLinePoints] = useState<THREE.Vector3[]>(
    [],
  );
  const [historyLineSegments, setHistoryLineSegments] = useState<
    THREE.Vector3[][]
  >([]);
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Box selection state
  const [showBoxSelection, setShowBoxSelection] = useState(false);
  const [boxCoords, setBoxCoords] = useState({
    L1: '',
    a1: '',
    b1: '',
    L2: '',
    a2: '',
    b2: '',
  });
  const [selectionBox, setSelectionBox] = useState<{
    min: { L: number; a: number; b: number };
    max: { L: number; a: number; b: number };
  } | null>(null);

  // PCA state
  const [pcaResults, setPcaResults] = useState<{
    center: { L: number; a: number; b: number };
    components: Array<{
      L: number;
      a: number;
      b: number;
      eigenvalue: number;
      variance: number;
    }>;
    variance: number[];
    totalVariance: number;
    totalVarianceExplained: number;
    eigenvalues: number[];
    explainedVariance: number[];
  } | null>(null);
  const [showPCAAxes, setShowPCAAxes] = useState(false);
  const [showPCADialog, setShowPCADialog] = useState(false);

  // Transformation state
  const [showTransformation, setShowTransformation] = useState(false);
  const [transformParams, setTransformParams] = useState({
    scaleX: '1.0',
    scaleY: '1.0',
    scaleZ: '1.0',
    translateX: '0.0',
    translateY: '0.0',
    translateZ: '0.0',
    rotateX: '0.0',
    rotateY: '0.0',
    rotateZ: '0.0',
  });
  const [originalProductPoints, setOriginalProductPoints] = useState<
    colorPointType[]
  >([]);

  // Corrected color display state
  const [useCorrectedColors, setUseCorrectedColors] = useState(false);

  // Function to update product points based on color mode
  const updateProductPoints = (products: Product[], useCorrected: boolean) => {
    const newProductPoints: colorPointType[] = products.map((product) => {
      // Use corrected colors if available and switch is on, otherwise use original
      const colorToUse =
        useCorrected && product.corrected_color_lab
          ? product.corrected_color_lab
          : product.color_lab;

      return {
        position: {
          L: colorToUse[0],
          a: colorToUse[1],
          b: colorToUse[2],
        },
        color: product.color_hex,
        description: `${product.product_brand_name} - ${product.product_description}${useCorrected && product.corrected_color_lab ? ' (Corrected)' : ''}`,
      };
    });

    setProductPoints(newProductPoints);
    // Reset original points for transformation if needed
    if (!useCorrected) {
      setOriginalProductPoints(newProductPoints);
    }
  };

  // Handle corrected color toggle
  const handleCorrectedColorToggle = () => {
    const newUseCorrected = !useCorrectedColors;
    setUseCorrectedColors(newUseCorrected);
    updateProductPoints(products, newUseCorrected);
  };

  // Color options for group rings
  const colorOptions = [
    { label: 'Blue', value: '#1976d2' },
    { label: 'Red', value: '#d32f2f' },
    { label: 'Green', value: '#2e7d32' },
    { label: 'Orange', value: '#f57c00' },
    { label: 'Purple', value: '#7b1fa2' },
    { label: 'Light Blue', value: '#0288d1' },
    { label: 'Amber', value: '#ffa000' },
    { label: 'Brown', value: '#5d4037' },
  ];

  // Check if 3D libraries are available
  const has3DLibraries = true; // React Three Fiber is installed

  // Initialize window to show most recent points on first render
  React.useEffect(() => {
    const initialStart = Math.max(
      0,
      colorPointsFull.points.length - displayLimit,
    );
    setWindowStart(initialStart);
  }, [colorPointsFull.points.length]);

  // Navigation handlers for window
  const handlePreviousWindow = () => {
    setWindowStart((prev) => Math.max(0, prev - displayLimit));
  };

  const handleNextWindow = () => {
    setWindowStart((prev) => {
      const maxStart = Math.max(
        0,
        colorPointsFull.points.length - displayLimit,
      );
      return Math.min(maxStart, prev + displayLimit);
    });
  };

  const handleJumpToStart = () => {
    setWindowStart(0);
  };

  const handleJumpToEnd = () => {
    setWindowStart(Math.max(0, colorPointsFull.points.length - displayLimit));
  };

  // Calculate window end and ensure it doesn't exceed array length
  const windowEnd = Math.min(
    windowStart + displayLimit,
    colorPointsFull.points.length,
  );

  // Create windowed colorPoints
  const colorPoints = {
    ...colorPointsFull,
    points: colorPointsFull.points.slice(windowStart, windowEnd),
  };

  const handlePointSelect = (index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );

    // Auto-scroll to selected point in list
    setTimeout(() => {
      scrollToSelectedItem(index, pointsScrollRef, colorPoints.points.length);
    }, 100);
  };

  const handleSelectAll = () => {
    if (selectedIndices.length === colorPoints.points.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(colorPoints.points.map((_, index) => index));
    }
  };

  const handleHideSelected = () => {
    setHiddenIndices((prev) => [...new Set([...prev, ...selectedIndices])]);
    setSelectedIndices([]);
  };

  const handleUnhideAll = () => {
    setHiddenIndices([]);
  };

  const handleUnhideSelected = () => {
    setHiddenIndices((prev) =>
      prev.filter((index) => !selectedIndices.includes(index)),
    );
    setSelectedIndices([]);
  };

  // Box selection functions
  const handleBoxCoordChange = (coord: string, value: string) => {
    setBoxCoords((prev) => ({ ...prev, [coord]: value }));
  };

  const updateSelectionBox = () => {
    const coords = boxCoords;

    // Validate that all fields have values
    if (
      !coords.L1 ||
      !coords.a1 ||
      !coords.b1 ||
      !coords.L2 ||
      !coords.a2 ||
      !coords.b2
    ) {
      return;
    }

    const L1 = parseFloat(coords.L1);
    const a1 = parseFloat(coords.a1);
    const b1 = parseFloat(coords.b1);
    const L2 = parseFloat(coords.L2);
    const a2 = parseFloat(coords.a2);
    const b2 = parseFloat(coords.b2);

    // Validate that all values are numbers
    if (
      isNaN(L1) ||
      isNaN(a1) ||
      isNaN(b1) ||
      isNaN(L2) ||
      isNaN(a2) ||
      isNaN(b2)
    ) {
      return;
    }

    // Create box with min/max coordinates
    const newSelectionBox = {
      min: {
        L: Math.min(L1, L2),
        a: Math.min(a1, a2),
        b: Math.min(b1, b2),
      },
      max: {
        L: Math.max(L1, L2),
        a: Math.max(a1, a2),
        b: Math.max(b1, b2),
      },
    };

    console.log('Setting selection box:', newSelectionBox);
    setSelectionBox(newSelectionBox);
  };

  const selectPointsInBox = () => {
    if (!selectionBox) return;

    const pointsInBox: number[] = [];

    colorPoints.points.forEach((point, index) => {
      const { L, a, b } = point.position;

      if (
        L >= selectionBox.min.L &&
        L <= selectionBox.max.L &&
        a >= selectionBox.min.a &&
        a <= selectionBox.max.a &&
        b >= selectionBox.min.b &&
        b <= selectionBox.max.b
      ) {
        pointsInBox.push(index);
      }
    });

    setSelectedIndices(pointsInBox);
  };

  const clearBoxSelection = () => {
    setSelectionBox(null);
    setBoxCoords({
      L1: '',
      a1: '',
      b1: '',
      L2: '',
      a2: '',
      b2: '',
    });
    setShowBoxSelection(false);
  };

  // PCA Analysis Functions
  const calculatePCA = (points: Array<{ L: number; a: number; b: number }>) => {
    if (points.length < 3) return null;

    try {
      // Convert points to matrix format [L, a, b] for each point
      const dataMatrix = points.map((p) => [p.L, p.a, p.b]);
      const matrix = new Matrix(dataMatrix);

      // Calculate PCA
      const pca = new PCA(matrix, { center: true, scale: false });

      // Get the mean (center) of the data
      const center = {
        L: pca.means[0],
        a: pca.means[1],
        b: pca.means[2],
      };

      // Get principal components (eigenvectors)
      const loadings = pca.getLoadings();
      const eigenvalues = pca.getEigenvalues();
      const explainedVariance = pca.getExplainedVariance();

      // Convert loadings to our format
      const components = [];
      for (let i = 0; i < Math.min(3, loadings.columns); i++) {
        components.push({
          L: loadings.get(0, i), // First row (L component)
          a: loadings.get(1, i), // Second row (a component)
          b: loadings.get(2, i), // Third row (b component)
          eigenvalue: eigenvalues[i],
          variance: explainedVariance[i] / 100, // Convert percentage to decimal
        });
      }

      // Total variance explained
      const totalVarianceExplained = explainedVariance.reduce(
        (sum, v) => sum + v,
        0,
      );

      // Sum of eigenvalues (total variance in data)
      const totalVariance = eigenvalues.reduce((sum, v) => sum + v, 0);

      return {
        center,
        components,
        variance: explainedVariance.map((v) => v / 100), // Convert to decimal
        totalVariance,
        totalVarianceExplained,
        eigenvalues,
        explainedVariance,
      };
    } catch (error) {
      console.error('PCA calculation error:', error);
      return null;
    }
  };

  const handlePCAAnalysis = () => {
    if (selectedIndices.length < 3) return;

    const selectedPoints = selectedIndices.map(
      (i) => colorPoints.points[i].position,
    );
    const results = calculatePCA(selectedPoints);

    if (results) {
      setPcaResults(results);
      setShowPCAAxes(true);
      setShowPCADialog(true);
      console.log('PCA Results:', results);
    }
  };

  // Transformation handlers
  const handleTransformParamChange = (param: string, value: string) => {
    setTransformParams({ ...transformParams, [param]: value });
  };

  const applyTransformation = () => {
    if (productPoints.length === 0) return;

    // Store original points if not already stored
    if (originalProductPoints.length === 0) {
      setOriginalProductPoints([...productPoints]);
    }

    // Calculate center point for scaling
    const center = originalProductPoints.reduce(
      (acc, point) => {
        acc.L += point.position.L;
        acc.a += point.position.a;
        acc.b += point.position.b;
        return acc;
      },
      { L: 0, a: 0, b: 0 },
    );
    center.L /= originalProductPoints.length;
    center.a /= originalProductPoints.length;
    center.b /= originalProductPoints.length;

    // Apply transformation to each point
    const transformedPoints = originalProductPoints.map((point) => {
      let { L, a, b } = point.position;

      // 1. Scale relative to center
      const scaleX = parseFloat(transformParams.scaleX) || 1;
      const scaleY = parseFloat(transformParams.scaleY) || 1;
      const scaleZ = parseFloat(transformParams.scaleZ) || 1;

      L = center.L + (L - center.L) * scaleX;
      a = center.a + (a - center.a) * scaleY;
      b = center.b + (b - center.b) * scaleZ;

      // 2. Apply rotation (simplified - around center)
      const rotX = ((parseFloat(transformParams.rotateX) || 0) * Math.PI) / 180;
      const rotY = ((parseFloat(transformParams.rotateY) || 0) * Math.PI) / 180;
      const rotZ = ((parseFloat(transformParams.rotateZ) || 0) * Math.PI) / 180;

      // Translate to origin for rotation
      let x = L - center.L;
      let y = a - center.a;
      let z = b - center.b;

      // Apply rotations (simplified 3D rotation)
      if (rotX !== 0) {
        const newY = y * Math.cos(rotX) - z * Math.sin(rotX);
        const newZ = y * Math.sin(rotX) + z * Math.cos(rotX);
        y = newY;
        z = newZ;
      }

      if (rotY !== 0) {
        const newX = x * Math.cos(rotY) + z * Math.sin(rotY);
        const newZ = -x * Math.sin(rotY) + z * Math.cos(rotY);
        x = newX;
        z = newZ;
      }

      if (rotZ !== 0) {
        const newX = x * Math.cos(rotZ) - y * Math.sin(rotZ);
        const newY = x * Math.sin(rotZ) + y * Math.cos(rotZ);
        x = newX;
        y = newY;
      }

      // Translate back and add translation offset
      L = x + center.L + (parseFloat(transformParams.translateX) || 0);
      a = y + center.a + (parseFloat(transformParams.translateY) || 0);
      b = z + center.b + (parseFloat(transformParams.translateZ) || 0);

      return {
        ...point,
        position: { L, a, b },
      };
    });

    setProductPoints(transformedPoints);
  };

  const resetTransformation = () => {
    if (originalProductPoints.length > 0) {
      setProductPoints([...originalProductPoints]);
      setTransformParams({
        scaleX: '1.0',
        scaleY: '1.0',
        scaleZ: '1.0',
        translateX: '0.0',
        translateY: '0.0',
        translateZ: '0.0',
        rotateX: '0.0',
        rotateY: '0.0',
        rotateZ: '0.0',
      });
    }
  };

  // Calculate average point from selected points
  const calculateAveragePoint = () => {
    if (selectedIndices.length === 0) return null;

    const selectedPoints = selectedIndices.map((i) => colorPoints.points[i]);
    const avgL =
      selectedPoints.reduce((sum, p) => sum + p.position.L, 0) /
      selectedPoints.length;
    const avgA =
      selectedPoints.reduce((sum, p) => sum + p.position.a, 0) /
      selectedPoints.length;
    const avgB =
      selectedPoints.reduce((sum, p) => sum + p.position.b, 0) /
      selectedPoints.length;

    // Convert average Lab to approximate hex color
    const labToHex = (l: number, a: number, b: number) => {
      // Simplified Lab to RGB conversion for visualization
      // Approximate RGB values (simplified)
      const r = Math.max(0, Math.min(255, Math.round((l / 100) * 255)));
      const g = Math.max(0, Math.min(255, Math.round(128 + a * 1.5)));
      const blue = Math.max(0, Math.min(255, Math.round(128 + b * 1.5)));

      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
    };

    return {
      position: { L: avgL, a: avgA, b: avgB },
      color: labToHex(avgL, avgA, avgB),
      description: `Average of ${selectedIndices.length} points`,
    };
  };

  const handleSaveAverage = () => {
    setSaveDialogOpen(true);
    setAveragePointName(
      `Average_${selectedIndices.length}_points_${new Date().toISOString().slice(0, 10)}`,
    );
  };

  const handleSaveConfirm = () => {
    const avgPoint = calculateAveragePoint();
    if (avgPoint && averagePointName.trim()) {
      const pointToSave = {
        ...avgPoint,
        description: averagePointName.trim(),
      };

      // Add to colorPoints (you may want to implement actual saving logic)
      colorPoints.points.push(pointToSave);
      console.log('Saved average point:', pointToSave);

      setSaveDialogOpen(false);
      setAveragePointName('');
      setSelectedIndices([]); // Clear selection after saving
    }
  };

  // Group management functions
  const handleSaveGroup = () => {
    if (selectedIndices.length < 2) return;
    setGroupName(
      `Group_${colorGroups.length + 1}_${new Date().toISOString().slice(0, 10)}`,
    );
    setSaveGroupDialogOpen(true);
  };

  const handleSaveGroupConfirm = () => {
    if (groupName.trim() && selectedIndices.length > 0) {
      const newGroup: ColorGroup = {
        id: `group_${Date.now()}`,
        name: groupName,
        pointIndices: [...selectedIndices],
        ringColor: groupRingColor,
        createdAt: new Date(),
      };
      setColorGroups((prev) => [...prev, newGroup]);
      setSaveGroupDialogOpen(false);
      setGroupName('');
      setSelectedIndices([]); // Clear selection after saving
    }
  };

  const handleSelectGroup = (groupId: string) => {
    const group = colorGroups.find((g) => g.id === groupId);
    if (group) {
      // Filter out invalid indices that might reference deleted points
      const validIndices = group.pointIndices.filter(
        (i) => i >= 0 && i < colorPoints.points.length,
      );
      setSelectedIndices(validIndices);
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    setColorGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  // Product matching function
  const handleFindProducts = async () => {
    if (selectedIndices.length !== 1) return;

    const selectedPoint = colorPoints.points[selectedIndices[0]];
    setIsLoadingProducts(true);
    setProductError(null);

    try {
      const request: ProductMatchRequest = {
        store_name: 'dm',
        store_location: storeLocation,
        length: resultsLength,
        target_color: [
          selectedPoint.position.L,
          selectedPoint.position.a,
          selectedPoint.position.b,
        ],
        include_scanning_history: true, // Request corrected colors
      };

      const response = await fetchProductMatches(request, token);
      setProducts(response.products);

      // Extract unique product types for filter dropdown
      const types = [...new Set(response.products.map((p) => p.type))].sort();
      setAvailableProductTypes(types);

      // Extract unique brands for filter dropdown
      const brands = [
        ...new Set(response.products.map((p) => p.product_brand_name)),
      ].sort();
      setAvailableBrands(brands);

      // Reset brand filter when new products are loaded
      setSelectedBrand('all');

      // Convert products to color points for visualization
      updateProductPoints(response.products, useCorrectedColors);

      const distances = response.products.map((p) => p.color_distance);
      setProductDistances(distances);
      setShowProductsList(true);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProductError(
        error instanceof Error ? error.message : 'Failed to fetch products',
      );
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Function to parse product history and create history points
  const parseProductHistory = (
    product: Product,
  ): { historyPoints: colorPointType[]; linePoints: THREE.Vector3[] } => {
    const parsedHistoryPoints: colorPointType[] = [];
    const linePoints: THREE.Vector3[] = [];

    if (!product.history || typeof product.history !== 'object') {
      return { historyPoints: [], linePoints: [] };
    }

    // Sort history entries by timestamp
    const sortedEntries = Object.entries(product.history)
      .filter(
        ([, value]) =>
          value &&
          typeof value === 'object' &&
          value.color_lab &&
          value.color_hex,
      )
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());

    sortedEntries.forEach(([timestamp, data]) => {
      if (data.color_lab && data.color_hex) {
        const [L, a, b] = data.color_lab;

        // Create history point
        const historyPoint: colorPointType = {
          position: { L, a, b },
          color: data.color_hex,
          description: `${product.product_brand_name} - ${new Date(timestamp).toLocaleDateString()} ${new Date(timestamp).toLocaleTimeString()}`,
        };

        parsedHistoryPoints.push(historyPoint);

        // Create line point for 3D visualization
        const position = new THREE.Vector3(
          a / 20, // x-axis: a component
          L / 10 - 5, // y-axis: L component (shifted down)
          b / 20, // z-axis: b component
        );
        linePoints.push(position);
      }
    });

    // Add current product position as the final point
    const [currentL, currentA, currentB] = product.color_lab;
    const currentPoint: colorPointType = {
      position: { L: currentL, a: currentA, b: currentB },
      color: product.color_hex,
      description: `${product.product_brand_name} - Current`,
    };
    parsedHistoryPoints.push(currentPoint);

    const currentPosition = new THREE.Vector3(
      currentA / 20,
      currentL / 10 - 5,
      currentB / 20,
    );
    linePoints.push(currentPosition);

    return { historyPoints: parsedHistoryPoints, linePoints };
  };

  // Function to show history for all products
  const handleShowAllHistory = () => {
    if (showAllHistory) {
      // Hide all history
      setShowAllHistory(false);
      setHistoryPoints([]);
      setHistoryLinePoints([]);
      setHistoryLineSegments([]);
      setSelectedProductIndex(null);
    } else {
      // Show history for all products
      setShowAllHistory(true);
      setSelectedProductIndex(null);

      const allHistoryPoints: colorPointType[] = [];
      const allLineSegments: THREE.Vector3[][] = [];

      products.forEach((product) => {
        const { historyPoints: productHistory, linePoints: productLines } =
          parseProductHistory(product);
        allHistoryPoints.push(...productHistory);

        // Only add line segments if there are at least 2 points
        if (productLines.length >= 2) {
          allLineSegments.push(productLines);
        }
      });

      setHistoryPoints(allHistoryPoints);
      setHistoryLineSegments(allLineSegments);
    }
  };

  // Helper function to check if a product has been rescanned
  const isProductRescanned = (product: Product): boolean => {
    // Check if history object has any rescanning indicators
    // This might include fields like 'rescanned', 'scan_count', 'last_scan', etc.
    if (!product.history || typeof product.history !== 'object') {
      return false;
    }

    // Check for common rescanning indicators in the history object
    const historyKeys = Object.keys(product.history);
    for (const key of historyKeys) {
      const entry = product.history[key];
      if (
        entry &&
        typeof entry === 'object' &&
        ('color_hex' in entry || 'color_lab' in entry)
      ) {
        return true;
      }
    }

    // Check if history has multiple entries (could indicate rescanning)
    return historyKeys.length > 0; // Assuming more than 0 history entries indicates rescanning
  };

  // Filter products based on current filter settings
  const filteredProducts = products.filter((product) => {
    // Filter by rescanned status
    if (rescannedFilter === 'rescanned' && !isProductRescanned(product)) {
      return false;
    }
    if (rescannedFilter === 'not_rescanned' && isProductRescanned(product)) {
      return false;
    }
    // If rescannedFilter === 'all', show all products regardless of rescanned status

    // Filter by product type
    if (selectedProductType !== 'all' && product.type !== selectedProductType) {
      return false;
    }

    // Filter by brand
    if (
      selectedBrand !== 'all' &&
      product.product_brand_name !== selectedBrand
    ) {
      return false;
    }

    return true;
  });

  // Create filtered product points and distances for 3D visualization
  const filteredProductPoints: colorPointType[] = [];
  const filteredProductDistances: number[] = [];

  if (productPoints && productDistances) {
    // Use the already filtered products to ensure consistency with all filters
    filteredProducts.forEach((filteredProduct) => {
      // Find the index of this product in the original products array
      const originalIndex = products.findIndex(
        (p) => p.product_id === filteredProduct.product_id,
      );

      if (
        originalIndex !== -1 &&
        productPoints[originalIndex] &&
        productDistances[originalIndex] !== undefined
      ) {
        filteredProductPoints.push(productPoints[originalIndex]);
        filteredProductDistances.push(productDistances[originalIndex]);
      }
    });
  }

  // Handler for product point click (from 3D scene)
  const handleProductClick = (productIndex: number) => {
    const actualProductIndex = getActualProductIndex(productIndex);
    if (actualProductIndex !== -1) {
      const product = products[actualProductIndex];

      if (selectedProductIndex === actualProductIndex) {
        // If clicking the same product, deselect it
        setSelectedProductIndex(null);
        setHistoryPoints([]);
        setHistoryLinePoints([]);
        setHistoryLineSegments([]);
      } else {
        // Select new product and show its history
        setSelectedProductIndex(actualProductIndex);
        setShowAllHistory(false);
        setHistoryLineSegments([]);
        const { historyPoints: newHistoryPoints, linePoints } =
          parseProductHistory(product);
        setHistoryPoints(newHistoryPoints);
        setHistoryLinePoints(linePoints);

        // Auto-scroll to selected product in list
        setTimeout(() => {
          const filteredIndex = filteredProducts.findIndex(
            (p) => p.product_id === product.product_id,
          );
          if (filteredIndex !== -1) {
            scrollToSelectedItem(
              filteredIndex,
              productsScrollRef,
              filteredProducts.length,
            );
          }
        }, 100);
      }
    }
  };

  // Handler for product list item click
  const handleProductListClick = (product: Product) => {
    const actualProductIndex = products.findIndex(
      (p) => p.product_id === product.product_id,
    );

    if (actualProductIndex !== -1) {
      // Reset show all history when selecting individual product
      setShowAllHistory(false);
      setHistoryLineSegments([]);

      if (selectedProductIndex === actualProductIndex) {
        // If clicking the same product, deselect it
        setSelectedProductIndex(null);
        setHistoryPoints([]);
        setHistoryLinePoints([]);
        setHistoryLineSegments([]);
      } else {
        // Select new product and show its history
        setSelectedProductIndex(actualProductIndex);
        const { historyPoints: newHistoryPoints, linePoints } =
          parseProductHistory(product);
        setHistoryPoints(newHistoryPoints);
        setHistoryLinePoints(linePoints);
      }
    }
  };

  // Helper function to check if a product is currently selected
  const isProductSelected = (product: Product): boolean => {
    if (selectedProductIndex === null) return false;
    return products[selectedProductIndex]?.product_id === product.product_id;
  };

  // Helper function to format history data for display
  const getFormattedHistory = (product: Product) => {
    if (!product.history || typeof product.history !== 'object') {
      return [];
    }

    // Sort history entries by timestamp
    const sortedEntries = Object.entries(product.history)
      .filter(
        ([, value]) =>
          value &&
          typeof value === 'object' &&
          value.color_lab &&
          value.color_hex,
      )
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());

    return sortedEntries.map(([timestamp, data]) => ({
      timestamp: new Date(timestamp),
      formattedDate: new Date(timestamp).toLocaleDateString(),
      formattedTime: new Date(timestamp).toLocaleTimeString(),
      colorHex: data.color_hex,
      colorLab: data.color_lab as [number, number, number],
      isRecent:
        Date.now() - new Date(timestamp).getTime() < 7 * 24 * 60 * 60 * 1000, // Within last 7 days
    }));
  };

  // Helper function to get actual product index from filtered product index
  const getActualProductIndex = (filteredIndex: number): number => {
    if (filteredIndex < 0 || filteredIndex >= filteredProducts.length) {
      return -1;
    }

    const filteredProduct = filteredProducts[filteredIndex];
    return products.findIndex(
      (p) => p.product_id === filteredProduct.product_id,
    );
  };

  // Get ring color for a point (if it belongs to a group)
  const getPointRingColor = (pointIndex: number): string | null => {
    for (const group of colorGroups) {
      if (group.pointIndices.includes(pointIndex)) {
        return group.ringColor;
      }
    }
    return null;
  };

  // Utility function to scroll to selected item
  const scrollToSelectedItem = (
    itemIndex: number,
    scrollRef: React.RefObject<HTMLDivElement>,
    totalItems: number,
  ) => {
    const container = scrollRef.current;
    if (!container) return;

    const itemHeight = container.scrollHeight / totalItems;
    const targetScrollTop = itemIndex * itemHeight - container.clientHeight / 2;

    container.scrollTo({
      top: Math.max(
        0,
        Math.min(
          targetScrollTop,
          container.scrollHeight - container.clientHeight,
        ),
      ),
      behavior: 'smooth',
    });
  };

  // Smart Scrollbar Component
  const SmartScrollbar: React.FC<{
    scrollRef: React.RefObject<HTMLDivElement>;
    selectedItems: number[];
    totalItems: number;
    scrollHeight: number;
    scrollTop: number;
    onScrollUpdate: (scrollTop: number, scrollHeight: number) => void;
  }> = ({
    scrollRef,
    selectedItems,
    totalItems,
    scrollTop,
    onScrollUpdate,
  }) => {
    const scrollbarRef = React.useRef<HTMLDivElement>(null);

    // Update scroll tracking
    React.useEffect(() => {
      const element = scrollRef.current;
      if (!element) return;

      const handleScroll = () => {
        onScrollUpdate(element.scrollTop, element.scrollHeight);
      };

      const handleResize = () => {
        onScrollUpdate(element.scrollTop, element.scrollHeight);
      };

      element.addEventListener('scroll', handleScroll);
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(element);

      // Initial update
      handleScroll();

      return () => {
        element.removeEventListener('scroll', handleScroll);
        resizeObserver.disconnect();
      };
    }, [scrollRef, onScrollUpdate]);

    // Calculate scrollbar dimensions
    const element = scrollRef.current;
    if (!element || totalItems === 0) return null;

    const containerHeight = element.clientHeight;
    const contentHeight = element.scrollHeight;
    const hasOverflow = contentHeight > containerHeight;

    // Always show scrollbar when there are items (for visual indicators)
    const shouldShow = totalItems > 0 && containerHeight > 50;

    // Use actual container height for scrollbar
    const scrollbarHeight = Math.max(100, containerHeight - 16); // Subtract padding
    const thumbHeight = Math.max(
      20,
      (containerHeight / contentHeight) * scrollbarHeight,
    );
    const thumbTop =
      (scrollTop / (contentHeight - containerHeight)) *
      (scrollbarHeight - thumbHeight);

    // Calculate indicator positions for selected items
    const indicators = selectedItems.map((itemIndex) => {
      const itemPosition = (itemIndex / totalItems) * scrollbarHeight;
      return {
        index: itemIndex,
        position: Math.min(scrollbarHeight - 4, itemPosition),
      };
    });

    const handleScrollbarClick = (e: React.MouseEvent) => {
      if (!scrollbarRef.current || !element) return;

      const rect = scrollbarRef.current.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const scrollPercentage = clickY / scrollbarHeight;
      const targetScrollTop =
        scrollPercentage * (contentHeight - containerHeight);

      element.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth',
      });
    };

    if (!shouldShow) return null;

    return (
      <Box
        ref={scrollbarRef}
        onClick={handleScrollbarClick}
        sx={{
          position: 'absolute',
          right: 2,
          top: 8,
          bottom: 8,
          width: '14px',
          height: scrollbarHeight,
          backgroundColor: hasOverflow
            ? 'rgba(0, 0, 0, 0.08)'
            : 'rgba(0, 0, 0, 0.03)',
          borderRadius: '7px',
          cursor: hasOverflow ? 'pointer' : 'default',
          zIndex: 10,
          border: '1px solid rgba(0, 0, 0, 0.1)',
          '&:hover': {
            backgroundColor: hasOverflow
              ? 'rgba(0, 0, 0, 0.12)'
              : 'rgba(0, 0, 0, 0.05)',
          },
        }}
      >
        {/* Scroll thumb - only show when there's overflow */}
        {hasOverflow && (
          <Box
            sx={{
              position: 'absolute',
              left: '2px',
              right: '2px',
              top: thumbTop,
              height: thumbHeight,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '5px',
              transition: 'top 0.1s ease',
            }}
          />
        )}

        {/* Selected item indicators */}
        {indicators.map(({ index, position }) => (
          <Box
            key={index}
            sx={{
              position: 'absolute',
              left: '1px',
              right: '1px',
              top: position,
              height: '4px',
              backgroundColor: '#2196f3',
              borderRadius: '2px',
              boxShadow: '0 0 4px rgba(33, 150, 243, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          />
        ))}
      </Box>
    );
  };

  // Handle resizable panel dragging
  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    const container = document.getElementById('split-container');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const newLeftWidth =
      ((e.clientX - containerRect.left) / containerRect.width) * 100;

    // Constrain between 30% and 85%
    const constrainedWidth = Math.min(85, Math.max(30, newLeftWidth));
    setLeftPanelWidth(constrainedWidth);
  }, []);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Cleanup mouse events on component unmount
  React.useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const averagePoint = calculateAveragePoint();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Color Points Display ({colorPoints.points.length} points)
      </Typography>

      {/* Global Scale Control */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Global Scale ({globalScale.toFixed(1)}x)
        </Typography>
        <Slider
          value={globalScale}
          onChange={(_, newValue) => setGlobalScale(newValue as number)}
          min={0.05}
          max={1.0}
          step={0.05}
          marks={[
            { value: 0.5, label: '0.5x' },
            { value: 1, label: '1x' },
          ]}
          sx={{ width: '100%', maxWidth: 400 }}
        />
      </Box>

      {/* Product Matching Settings */}
      {selectedIndices.length === 1 && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Product Matching Settings
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <TextField
              label="Store Location"
              value={storeLocation}
              onChange={(e) => setStoreLocation(e.target.value)}
              size="small"
              sx={{ minWidth: 120 }}
            />
            <TextField
              label="Results Count"
              type="number"
              value={resultsLength}
              onChange={(e) => setResultsLength(Number(e.target.value))}
              size="small"
              inputProps={{ min: 1, max: 20 }}
              sx={{ minWidth: 120 }}
            />
            {productError && (
              <Alert severity="error" sx={{ flexGrow: 1 }}>
                {productError}
              </Alert>
            )}
          </Box>
        </Box>
      )}

      {/* Stats and Controls */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 3,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <Chip
          label={`${colorPointsFull.points.length} Total Points`}
          variant="outlined"
        />
        <Chip
          label={`${selectedIndices.length} Selected`}
          color={selectedIndices.length > 0 ? 'primary' : 'default'}
          variant={selectedIndices.length > 0 ? 'filled' : 'outlined'}
        />
        <TextField
          type="number"
          label="Window Size"
          value={displayLimit}
          onChange={(e) => setDisplayLimit(Math.max(1, Number(e.target.value)))}
          size="small"
          sx={{ width: '140px' }}
          inputProps={{ min: 1, max: colorPointsFull.points.length }}
          helperText={`Showing ${windowStart + 1}-${windowEnd} of ${colorPointsFull.points.length}`}
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label="First"
            onClick={handleJumpToStart}
            disabled={windowStart === 0}
            sx={{ cursor: windowStart === 0 ? 'default' : 'pointer' }}
            variant="outlined"
          />
          <Chip
            label="Previous"
            onClick={handlePreviousWindow}
            disabled={windowStart === 0}
            sx={{ cursor: windowStart === 0 ? 'default' : 'pointer' }}
            variant="outlined"
          />
          <Chip
            label="Next"
            onClick={handleNextWindow}
            disabled={windowEnd >= colorPointsFull.points.length}
            sx={{
              cursor:
                windowEnd >= colorPointsFull.points.length
                  ? 'default'
                  : 'pointer',
            }}
            variant="outlined"
          />
          <Chip
            label="Latest"
            onClick={handleJumpToEnd}
            disabled={windowEnd >= colorPointsFull.points.length}
            sx={{
              cursor:
                windowEnd >= colorPointsFull.points.length
                  ? 'default'
                  : 'pointer',
            }}
            variant="outlined"
          />
        </Box>
        {has3DLibraries && (
          <Chip
            label={use3D ? '3D View' : '2D View'}
            color={use3D ? 'primary' : 'secondary'}
            onClick={() => setUse3D(!use3D)}
            sx={{ cursor: 'pointer' }}
          />
        )}

        {/* Visibility Controls */}
        {selectedIndices.length > 0 && (
          <>
            {selectedIndices.length === 1 && (
              <Chip
                label={isLoadingProducts ? 'Finding...' : 'Find Products'}
                color="secondary"
                variant="filled"
                onClick={() => handleFindProducts()}
                disabled={isLoadingProducts}
                icon={<SearchIcon />}
                sx={{ cursor: 'pointer' }}
              />
            )}
            {selectedIndices.some(
              (index) => !hiddenIndices.includes(index),
            ) && (
              <Chip
                label="Hide Selected"
                color="warning"
                variant="outlined"
                onClick={handleHideSelected}
                icon={<VisibilityOffIcon />}
                sx={{ cursor: 'pointer' }}
              />
            )}
            {selectedIndices.some((index) => hiddenIndices.includes(index)) && (
              <Chip
                label="Unhide Selected"
                color="success"
                variant="outlined"
                onClick={handleUnhideSelected}
                icon={<VisibilityIcon />}
                sx={{ cursor: 'pointer' }}
              />
            )}
          </>
        )}
        {hiddenIndices.length > 0 && (
          <Chip
            label={`Unhide All (${hiddenIndices.length})`}
            color="success"
            variant="filled"
            onClick={handleUnhideAll}
            icon={<VisibilityIcon />}
            sx={{ cursor: 'pointer' }}
          />
        )}

        {selectedIndices.length > 1 && (
          <Chip
            label="Save Average"
            color="success"
            variant="filled"
            onClick={handleSaveAverage}
            sx={{ cursor: 'pointer' }}
          />
        )}
        {selectedIndices.length >= 1 && (
          <Chip
            label="Save Group"
            color="info"
            variant="filled"
            onClick={handleSaveGroup}
            sx={{ cursor: 'pointer' }}
          />
        )}
        {/* Selection and Save Controls */}
        {colorPoints.points.length > 0 && (
          <Chip
            label="Select All"
            variant="outlined"
            onClick={handleSelectAll}
            sx={{ cursor: 'pointer' }}
          />
        )}
        <Chip
          label="Clear Selection"
          color="primary"
          variant="outlined"
          onClick={() => setSelectedIndices([])}
          sx={{ cursor: 'pointer' }}
        />
        <Chip
          label="Create Selection Box"
          variant={showBoxSelection ? 'filled' : 'outlined'}
          color="secondary"
          onClick={() => setShowBoxSelection(!showBoxSelection)}
          sx={{ cursor: 'pointer' }}
        />
        {selectedIndices.length >= 3 && (
          <Chip
            label="PCA Analysis"
            variant="outlined"
            color="info"
            onClick={handlePCAAnalysis}
            sx={{ cursor: 'pointer' }}
          />
        )}
        {productPoints.length > 0 && (
          <Chip
            label="Transform Products"
            variant={showTransformation ? 'filled' : 'outlined'}
            color="warning"
            onClick={() => setShowTransformation(!showTransformation)}
            sx={{ cursor: 'pointer' }}
          />
        )}
      </Box>

      {/* Box Selection Coordinate Inputs */}
      {showBoxSelection && (
        <Box
          sx={{
            mt: 2,
            mb: 2,
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Selection Box Coordinates
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 1,
              mb: 2,
            }}
          >
            <TextField
              label="L1 (0-100)"
              size="small"
              type="number"
              value={boxCoords.L1}
              onChange={(e) => handleBoxCoordChange('L1', e.target.value)}
              placeholder="20"
              inputProps={{ step: '0.1' }}
            />
            <TextField
              label="a1 (-60 to 60)"
              size="small"
              type="number"
              value={boxCoords.a1}
              onChange={(e) => handleBoxCoordChange('a1', e.target.value)}
              placeholder="-10"
              inputProps={{ step: '0.1' }}
            />
            <TextField
              label="b1 (-60 to 60)"
              size="small"
              type="number"
              value={boxCoords.b1}
              onChange={(e) => handleBoxCoordChange('b1', e.target.value)}
              placeholder="-10"
              inputProps={{ step: '0.1' }}
            />
            <TextField
              label="L2 (0-100)"
              size="small"
              type="number"
              value={boxCoords.L2}
              onChange={(e) => handleBoxCoordChange('L2', e.target.value)}
              placeholder="80"
              inputProps={{ step: '0.1' }}
            />
            <TextField
              label="a2 (-60 to 60)"
              size="small"
              type="number"
              value={boxCoords.a2}
              onChange={(e) => handleBoxCoordChange('a2', e.target.value)}
              placeholder="10"
              inputProps={{ step: '0.1' }}
            />
            <TextField
              label="b2 (-60 to 60)"
              size="small"
              type="number"
              value={boxCoords.b2}
              onChange={(e) => handleBoxCoordChange('b2', e.target.value)}
              placeholder="10"
              inputProps={{ step: '0.1' }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              onClick={updateSelectionBox}
            >
              Update Box
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={selectPointsInBox}
              disabled={!selectionBox}
            >
              Select Points
            </Button>
            <Button variant="outlined" size="small" onClick={clearBoxSelection}>
              Clear
            </Button>
          </Box>
        </Box>
      )}

      {/* Transformation Controls */}
      {showTransformation && (
        <Box
          sx={{
            mt: 2,
            mb: 2,
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Product Points Transformation
          </Typography>

          {/* Scale Parameters */}
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Scale (relative to center):
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 1,
              mb: 2,
            }}
          >
            <TextField
              label="Scale X (L-axis)"
              size="small"
              type="number"
              value={transformParams.scaleX}
              onChange={(e) =>
                handleTransformParamChange('scaleX', e.target.value)
              }
              placeholder="1.0"
              inputProps={{ step: '0.1' }}
            />
            <TextField
              label="Scale Y (a-axis)"
              size="small"
              type="number"
              value={transformParams.scaleY}
              onChange={(e) =>
                handleTransformParamChange('scaleY', e.target.value)
              }
              placeholder="1.0"
              inputProps={{ step: '0.1' }}
            />
            <TextField
              label="Scale Z (b-axis)"
              size="small"
              type="number"
              value={transformParams.scaleZ}
              onChange={(e) =>
                handleTransformParamChange('scaleZ', e.target.value)
              }
              placeholder="1.0"
              inputProps={{ step: '0.1' }}
            />
          </Box>

          {/* Translation Parameters */}
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Translation:
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 1,
              mb: 2,
            }}
          >
            <TextField
              label="Translate X (L-axis)"
              size="small"
              type="number"
              value={transformParams.translateX}
              onChange={(e) =>
                handleTransformParamChange('translateX', e.target.value)
              }
              placeholder="0.0"
              inputProps={{ step: '0.5' }}
            />
            <TextField
              label="Translate Y (a-axis)"
              size="small"
              type="number"
              value={transformParams.translateY}
              onChange={(e) =>
                handleTransformParamChange('translateY', e.target.value)
              }
              placeholder="0.0"
              inputProps={{ step: '0.5' }}
            />
            <TextField
              label="Translate Z (b-axis)"
              size="small"
              type="number"
              value={transformParams.translateZ}
              onChange={(e) =>
                handleTransformParamChange('translateZ', e.target.value)
              }
              placeholder="0.0"
              inputProps={{ step: '0.5' }}
            />
          </Box>

          {/* Rotation Parameters */}
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Rotation (degrees):
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 1,
              mb: 2,
            }}
          >
            <TextField
              label="Rotate X"
              size="small"
              type="number"
              value={transformParams.rotateX}
              onChange={(e) =>
                handleTransformParamChange('rotateX', e.target.value)
              }
              placeholder="0.0"
              inputProps={{ step: '1' }}
            />
            <TextField
              label="Rotate Y"
              size="small"
              type="number"
              value={transformParams.rotateY}
              onChange={(e) =>
                handleTransformParamChange('rotateY', e.target.value)
              }
              placeholder="0.0"
              inputProps={{ step: '1' }}
            />
            <TextField
              label="Rotate Z"
              size="small"
              type="number"
              value={transformParams.rotateZ}
              onChange={(e) =>
                handleTransformParamChange('rotateZ', e.target.value)
              }
              placeholder="0.0"
              inputProps={{ step: '1' }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              onClick={applyTransformation}
              disabled={productPoints.length === 0}
            >
              Apply Transformation
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={resetTransformation}
              disabled={originalProductPoints.length === 0}
            >
              Reset to Original
            </Button>
          </Box>
        </Box>
      )}

      {/* Resizable Split Screen Layout */}
      <Box
        id="split-container"
        sx={{
          display: 'flex',
          height: '70vh',
          minHeight: 600,
          position: 'relative',
          userSelect: isDragging ? 'none' : 'auto',
        }}
      >
        {/* Left Side - 3D Visualization */}
        <Box
          sx={{
            width: `${leftPanelWidth}%`,
            minWidth: '300px',
            pr: 1,
          }}
        >
          <Paper
            sx={{
              p: 2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {colorPoints.points.length === 0 ? (
              <Alert severity="info">No color points to display</Alert>
            ) : has3DLibraries && use3D ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  position: 'relative',
                }}
              >
                <Box sx={{ flex: 1, minHeight: 0 }}>
                  <Tooltip
                    title={
                      <Box>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 'bold', mb: 1 }}
                        >
                          🎯 3D CIE Lab Color Space
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          • <strong>Mouse:</strong> Click and drag to rotate •
                          Scroll to zoom • Right-click and drag to pan
                        </Typography>
                        <Typography variant="body2">
                          • <strong>Axes:</strong> Red=a, Green=L, Blue=b •
                          Click spheres to select points
                        </Typography>
                      </Box>
                    }
                    placement="left"
                    arrow
                  >
                    <InfoIcon
                      color="info"
                      sx={{
                        cursor: 'help',
                        fontSize: '1.2rem',
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 10,
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: '50%',
                        padding: '4px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      }}
                    />
                  </Tooltip>
                  <Suspense
                    fallback={
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          height: '100%',
                        }}
                      >
                        <CircularProgress />
                      </Box>
                    }
                  >
                    <ColorSpace3D
                      points={colorPoints.points}
                      selectedIndices={selectedIndices}
                      onPointSelect={handlePointSelect}
                      averagePoint={averagePoint}
                      getPointRingColor={getPointRingColor}
                      globalScale={globalScale}
                      hiddenIndices={hiddenIndices}
                      productPoints={filteredProductPoints}
                      productDistances={filteredProductDistances}
                      onProductClick={handleProductClick}
                      historyPoints={historyPoints}
                      historyLinePoints={historyLinePoints}
                      showAllHistory={showAllHistory}
                      historyLineSegments={historyLineSegments}
                      selectionBox={selectionBox}
                      pcaResults={pcaResults}
                      showPCAAxes={showPCAAxes}
                    />
                  </Suspense>
                </Box>
              </Box>
            ) : (
              <ColorSpace2D
                points={colorPoints.points}
                selectedIndices={selectedIndices}
                onPointSelect={handlePointSelect}
                hiddenIndices={hiddenIndices}
              />
            )}
          </Paper>
        </Box>

        {/* Resizable Divider */}
        <Box
          onMouseDown={handleMouseDown}
          sx={{
            width: '8px',
            cursor: 'col-resize',
            backgroundColor: isDragging ? '#1976d2' : 'transparent',
            borderLeft: '1px solid #e0e0e0',
            borderRight: '1px solid #e0e0e0',
            '&:hover': {
              backgroundColor: '#f0f0f0',
            },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease',
          }}
        >
          <Box
            sx={{
              width: '2px',
              height: '40px',
              backgroundColor: '#ccc',
              borderRadius: '1px',
            }}
          />
        </Box>

        {/* Right Side - Points List */}
        <Box
          sx={{
            width: `${100 - leftPanelWidth}%`,
            minWidth: '300px',
            pl: 1,
          }}
        >
          <Paper
            sx={{
              p: 2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflowX: 'auto',
              overflowY: 'hidden',
            }}
          >
            {/* Toggle between Points, Groups, and Products */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                variant={
                  !showGroupsList && !showProductsList
                    ? 'contained'
                    : 'outlined'
                }
                size="small"
                onClick={() => {
                  setShowGroupsList(false);
                  setShowProductsList(false);
                }}
              >
                Points ({colorPoints.points.length})
              </Button>
              <Button
                variant={showGroupsList ? 'contained' : 'outlined'}
                size="small"
                onClick={() => {
                  setShowGroupsList(true);
                  setShowProductsList(false);
                }}
              >
                Groups ({colorGroups.length})
              </Button>
              <Button
                variant={showProductsList ? 'contained' : 'outlined'}
                size="small"
                onClick={() => {
                  setShowGroupsList(false);
                  setShowProductsList(true);
                }}
                disabled={products.length === 0}
              >
                Products (
                {products.length > 0
                  ? `${filteredProducts.length}/${products.length}`
                  : '0'}
                )
              </Button>
            </Box>

            {showProductsList ? (
              /* Products List */
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  overflowX: 'auto',
                  overflowY: 'auto',
                }}
              >
                <Box sx={{ mb: 2, flexShrink: 0 }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Product Matches
                  </Typography>

                  {/* Product Filters */}
                  {products.length > 0 && (
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 1,
                        flexWrap: 'wrap',
                        alignItems: 'center',
                      }}
                    >
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={selectedProductType}
                          onChange={(e) =>
                            setSelectedProductType(e.target.value)
                          }
                          label="Type"
                        >
                          <MenuItem value="all">All Types</MenuItem>
                          {availableProductTypes.map((type) => (
                            <MenuItem key={type} value={type}>
                              {type}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Brand</InputLabel>
                        <Select
                          value={selectedBrand}
                          onChange={(e) => setSelectedBrand(e.target.value)}
                          label="Brand"
                        >
                          <MenuItem value="all">All Brands</MenuItem>
                          {availableBrands.map((brand) => (
                            <MenuItem key={brand} value={brand}>
                              {brand}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Rescanned</InputLabel>
                        <Select
                          value={rescannedFilter}
                          onChange={(e) => setRescannedFilter(e.target.value)}
                          label="Rescanned"
                        >
                          <MenuItem value="all">All Products</MenuItem>
                          <MenuItem value="rescanned">Rescanned Only</MenuItem>
                          <MenuItem value="not_rescanned">
                            Not Rescanned
                          </MenuItem>
                        </Select>
                      </FormControl>

                      <Button
                        variant={showAllHistory ? 'contained' : 'outlined'}
                        size="small"
                        onClick={handleShowAllHistory}
                        disabled={products.length === 0}
                        sx={{ minWidth: 'auto' }}
                      >
                        {showAllHistory
                          ? 'Hide All History'
                          : 'Show All History'}
                      </Button>

                      <FormControlLabel
                        control={
                          <Switch
                            checked={useCorrectedColors}
                            onChange={handleCorrectedColorToggle}
                            disabled={
                              products.length === 0 ||
                              !products.some((p) => p.corrected_color_lab)
                            }
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="caption">
                            Corrected Colors
                          </Typography>
                        }
                        sx={{ ml: 1 }}
                      />

                      <Typography variant="caption" color="text.secondary">
                        Showing {filteredProducts.length} of {products.length}{' '}
                        products
                      </Typography>
                    </Box>
                  )}
                </Box>

                {products.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No products found. Select a single point and click
                    &ldquo;Find Products&rdquo;.
                  </Typography>
                ) : (
                  <>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mb: 1, display: 'block' }}
                    >
                      💡 Click any product to view its history in 3D space
                    </Typography>
                    <Box
                      sx={{
                        position: 'relative',
                        flex: 1,
                        minHeight: '350px', // Ensure container has height
                        pr: 1,
                      }}
                    >
                      <Box
                        ref={productsScrollRef}
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1,
                          height: '100%',
                          minHeight: '300px', // Ensure minimum height for overflow detection
                          overflowX: 'auto',
                          overflowY: 'auto',
                          pr: '20px', // Space for scrollbar
                          minWidth: 'max-content',
                          // Custom scrollbar styling
                          '&::-webkit-scrollbar': {
                            width: '0px', // Hide native scrollbar
                          },
                        }}
                      >
                        {filteredProducts.map((product) => {
                          const isRescanned = isProductRescanned(product);
                          const isSelected = isProductSelected(product);
                          return (
                            <Paper
                              key={product.product_id}
                              onClick={() => handleProductListClick(product)}
                              sx={{
                                p: 2,
                                border: isSelected
                                  ? '2px solid #1976d2'
                                  : '1px solid #e0e0e0',
                                borderLeft: `4px solid ${getDistanceColor(product.color_distance)}`,
                                backgroundColor: isSelected
                                  ? 'rgba(25, 118, 210, 0.08)' // Light blue for selected
                                  : isRescanned
                                    ? 'rgba(255, 193, 7, 0.1)'
                                    : 'inherit', // Light yellow for rescanned
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  backgroundColor: isSelected
                                    ? 'rgba(25, 118, 210, 0.12)'
                                    : 'rgba(0, 0, 0, 0.04)',
                                  transform: 'translateY(-1px)',
                                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                },
                              }}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'start',
                                  gap: 2,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 40,
                                    height: 40,
                                    backgroundColor: product.color_hex,
                                    border: '1px solid #ccc',
                                    borderRadius: 1,
                                    flexShrink: 0,
                                  }}
                                />
                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                  <Typography
                                    variant="subtitle2"
                                    sx={{ fontWeight: 'bold' }}
                                  >
                                    {product.product_brand_name}
                                  </Typography>
                                  <Typography variant="body2" sx={{ mb: 1 }}>
                                    {product.product_description}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{ mb: 1, color: 'text.secondary' }}
                                  >
                                    GTIN: {product.product_id}
                                  </Typography>
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      gap: 1,
                                      flexWrap: 'wrap',
                                      mb: 1,
                                    }}
                                  >
                                    <Chip
                                      label={product.match_percentage}
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                    />
                                    <Chip
                                      label={`${product.price}`}
                                      size="small"
                                      variant="outlined"
                                    />
                                    <Chip
                                      label={product.type}
                                      size="small"
                                      variant="outlined"
                                    />
                                    {isRescanned && (
                                      <Chip
                                        label="Rescanned"
                                        size="small"
                                        color="warning"
                                        variant="filled"
                                      />
                                    )}
                                  </Box>
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      gap: 1,
                                      alignItems: 'center',
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Distance:{' '}
                                      {product.color_distance.toFixed(2)}
                                    </Typography>
                                    {product.instore_status && (
                                      <Chip
                                        label={`In Stock: ${product.stock_level}`}
                                        size="small"
                                        color="success"
                                        variant="outlined"
                                      />
                                    )}
                                  </Box>

                                  {/* Expandable History Section */}
                                  {isSelected &&
                                    (() => {
                                      const historyData =
                                        getFormattedHistory(product);
                                      return historyData.length > 0 ? (
                                        <Box
                                          sx={{
                                            mt: 2,
                                            pt: 2,
                                            borderTop: '1px solid #e0e0e0',
                                          }}
                                        >
                                          <Typography
                                            variant="subtitle2"
                                            sx={{ mb: 1, fontWeight: 'bold' }}
                                          >
                                            📊 Color History Timeline (
                                            {historyData.length} entries)
                                          </Typography>
                                          <Box
                                            sx={{
                                              maxHeight: 200,
                                              overflowY: 'auto',
                                              pr: 1,
                                            }}
                                          >
                                            {historyData.map((entry, index) => (
                                              <Box
                                                key={index}
                                                sx={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: 2,
                                                  mb: 1.5,
                                                  p: 1,
                                                  borderRadius: 1,
                                                  backgroundColor:
                                                    entry.isRecent
                                                      ? 'rgba(76, 175, 80, 0.05)'
                                                      : 'rgba(0, 0, 0, 0.02)',
                                                  border: entry.isRecent
                                                    ? '1px solid rgba(76, 175, 80, 0.2)'
                                                    : '1px solid rgba(0, 0, 0, 0.08)',
                                                }}
                                              >
                                                <Box
                                                  sx={{
                                                    width: 24,
                                                    height: 24,
                                                    backgroundColor:
                                                      entry.colorHex,
                                                    border: '1px solid #ccc',
                                                    borderRadius: '50%',
                                                    flexShrink: 0,
                                                    boxShadow:
                                                      '0 1px 3px rgba(0,0,0,0.2)',
                                                  }}
                                                />
                                                <Box
                                                  sx={{
                                                    flexGrow: 1,
                                                    minWidth: 0,
                                                  }}
                                                >
                                                  <Typography
                                                    variant="caption"
                                                    sx={{
                                                      fontWeight: 'medium',
                                                    }}
                                                  >
                                                    {entry.formattedDate} at{' '}
                                                    {entry.formattedTime}
                                                    {entry.isRecent && (
                                                      <Chip
                                                        label="Recent"
                                                        size="small"
                                                        color="success"
                                                        variant="outlined"
                                                        sx={{
                                                          ml: 1,
                                                          fontSize: '0.6rem',
                                                          height: 16,
                                                        }}
                                                      />
                                                    )}
                                                  </Typography>
                                                  <Box
                                                    sx={{
                                                      display: 'flex',
                                                      gap: 0.5,
                                                      mt: 0.5,
                                                      flexWrap: 'wrap',
                                                    }}
                                                  >
                                                    <Chip
                                                      label={`L: ${entry.colorLab[0].toFixed(1)}`}
                                                      size="small"
                                                      variant="outlined"
                                                      sx={{
                                                        fontSize: '0.65rem',
                                                        height: 18,
                                                      }}
                                                    />
                                                    <Chip
                                                      label={`a: ${entry.colorLab[1].toFixed(1)}`}
                                                      size="small"
                                                      variant="outlined"
                                                      sx={{
                                                        fontSize: '0.65rem',
                                                        height: 18,
                                                      }}
                                                    />
                                                    <Chip
                                                      label={`b: ${entry.colorLab[2].toFixed(1)}`}
                                                      size="small"
                                                      variant="outlined"
                                                      sx={{
                                                        fontSize: '0.65rem',
                                                        height: 18,
                                                      }}
                                                    />
                                                    <Chip
                                                      label={entry.colorHex}
                                                      size="small"
                                                      variant="outlined"
                                                      sx={{
                                                        fontSize: '0.65rem',
                                                        height: 18,
                                                        fontFamily: 'monospace',
                                                      }}
                                                    />
                                                  </Box>
                                                </Box>
                                              </Box>
                                            ))}
                                          </Box>

                                          {/* Current Color Info */}
                                          <Box
                                            sx={{
                                              mt: 2,
                                              pt: 1,
                                              borderTop: '1px dashed #ccc',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 2,
                                            }}
                                          >
                                            <Box
                                              sx={{
                                                width: 24,
                                                height: 24,
                                                backgroundColor:
                                                  product.color_hex,
                                                border: '2px solid #1976d2',
                                                borderRadius: '50%',
                                                flexShrink: 0,
                                                boxShadow:
                                                  '0 2px 4px rgba(0,0,0,0.2)',
                                              }}
                                            />
                                            <Box>
                                              <Typography
                                                variant="caption"
                                                sx={{ fontWeight: 'bold' }}
                                              >
                                                Current Color
                                              </Typography>
                                              <Box
                                                sx={{
                                                  display: 'flex',
                                                  gap: 0.5,
                                                  mt: 0.5,
                                                  flexWrap: 'wrap',
                                                }}
                                              >
                                                <Chip
                                                  label={`L: ${product.color_lab[0].toFixed(1)}`}
                                                  size="small"
                                                  color="primary"
                                                  variant="filled"
                                                  sx={{
                                                    fontSize: '0.65rem',
                                                    height: 18,
                                                  }}
                                                />
                                                <Chip
                                                  label={`a: ${product.color_lab[1].toFixed(1)}`}
                                                  size="small"
                                                  color="primary"
                                                  variant="filled"
                                                  sx={{
                                                    fontSize: '0.65rem',
                                                    height: 18,
                                                  }}
                                                />
                                                <Chip
                                                  label={`b: ${product.color_lab[2].toFixed(1)}`}
                                                  size="small"
                                                  color="primary"
                                                  variant="filled"
                                                  sx={{
                                                    fontSize: '0.65rem',
                                                    height: 18,
                                                  }}
                                                />
                                                <Chip
                                                  label={product.color_hex}
                                                  size="small"
                                                  color="primary"
                                                  variant="filled"
                                                  sx={{
                                                    fontSize: '0.65rem',
                                                    height: 18,
                                                    fontFamily: 'monospace',
                                                  }}
                                                />
                                              </Box>
                                            </Box>
                                          </Box>
                                        </Box>
                                      ) : (
                                        <Box
                                          sx={{
                                            mt: 2,
                                            pt: 2,
                                            borderTop: '1px solid #e0e0e0',
                                          }}
                                        >
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                          >
                                            📊 No color history available for
                                            this product
                                          </Typography>
                                        </Box>
                                      );
                                    })()}
                                </Box>
                              </Box>
                            </Paper>
                          );
                        })}
                      </Box>

                      {/* Smart Scrollbar for Products */}
                      <SmartScrollbar
                        scrollRef={productsScrollRef}
                        selectedItems={
                          selectedProductIndex !== null
                            ? [selectedProductIndex]
                            : []
                        }
                        totalItems={filteredProducts.length}
                        scrollHeight={productsScrollHeight}
                        scrollTop={productsScrollTop}
                        onScrollUpdate={(scrollTop, scrollHeight) => {
                          setProductsScrollTop(scrollTop);
                          setProductsScrollHeight(scrollHeight);
                        }}
                      />
                    </Box>
                  </>
                )}
              </Box>
            ) : showGroupsList ? (
              /* Groups List */
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  overflowX: 'auto',
                  overflowY: 'auto',
                }}
              >
                <Typography variant="h6" sx={{ mb: 1, flexShrink: 0 }}>
                  Saved Groups
                </Typography>
                {colorGroups.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No groups saved yet
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                      minWidth: 'max-content',
                    }}
                  >
                    {colorGroups.map((group) => (
                      <Paper
                        key={group.id}
                        sx={{
                          p: 2,
                          border: '1px solid #e0e0e0',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'grey.50' },
                        }}
                        onClick={() => handleSelectGroup(group.id)}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Box
                              sx={{
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                backgroundColor: group.ringColor,
                                border: '1px solid #ccc',
                              }}
                            />
                            <Typography variant="subtitle2">
                              {group.name}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(group.id);
                            }}
                            sx={{ color: 'error.main' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {group.pointIndices.length} points •{' '}
                          {new Date(group.createdAt).toLocaleDateString()}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Box>
            ) : (
              /* Points List */
              <>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    mb: 1,
                    flexShrink: 0,
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography variant="h6">Point Details</Typography>
                </Box>
                {colorPoints.points.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No points available
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      position: 'relative',
                      flex: 1,
                      minHeight: '350px', // Ensure container has height
                      pr: 1,
                    }}
                  >
                    <Box
                      ref={pointsScrollRef}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        height: '100%',
                        minHeight: '300px', // Ensure minimum height for overflow detection
                        overflowX: 'auto',
                        overflowY: 'auto',
                        pr: '20px', // Space for scrollbar
                        minWidth: 'max-content',
                        // Custom scrollbar styling
                        '&::-webkit-scrollbar': {
                          width: '0px', // Hide native scrollbar
                        },
                      }}
                    >
                      {colorPoints.points.map((point, index) => {
                        const isSelected = selectedIndices.includes(index);
                        const isHidden = hiddenIndices.includes(index);
                        return (
                          <Box
                            key={index}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              p: 1,
                              borderRadius: 1,
                              backgroundColor: isSelected
                                ? 'action.selected'
                                : 'transparent',
                              opacity: isHidden ? 0.5 : 1,
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              },
                              flexShrink: 0,
                              border: isSelected
                                ? '1px solid #1976d2'
                                : '1px solid transparent',
                              transition: 'all 0.2s ease',
                              minWidth: 'max-content',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handlePointSelect(index)}
                              size="small"
                              sx={{ p: 0.5 }}
                            />
                            <Box
                              sx={{
                                width: 20,
                                height: 20,
                                backgroundColor: point.color,
                                border: isSelected
                                  ? '3px solid #1976d2'
                                  : '1px solid #ccc',
                                borderRadius: '50%',
                                flexShrink: 0,
                                boxShadow: isSelected
                                  ? '0 0 8px rgba(25, 118, 210, 0.4)'
                                  : 'none',
                                transition: 'all 0.2s ease',
                              }}
                            />
                            <Box sx={{ flexGrow: 1, minWidth: 'max-content' }}>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{
                                    whiteSpace: 'nowrap',
                                    fontWeight: isSelected
                                      ? 'medium'
                                      : 'normal',
                                    flexGrow: 1,
                                  }}
                                >
                                  {point.description}
                                </Typography>
                                {isHidden && (
                                  <VisibilityOffIcon
                                    sx={{
                                      fontSize: '0.8rem',
                                      color: 'text.secondary',
                                      flexShrink: 0,
                                    }}
                                  />
                                )}
                              </Box>
                              <Box
                                sx={{
                                  display: 'flex',
                                  gap: 0.5,
                                  mt: 0.5,
                                  flexWrap: 'nowrap',
                                  minWidth: 'max-content',
                                }}
                              >
                                <Chip
                                  label={`L:${point.position.L.toFixed(1)}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.7rem',
                                  }}
                                />
                                <Chip
                                  label={`a:${point.position.a.toFixed(1)}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.7rem',
                                  }}
                                />
                                <Chip
                                  label={`b:${point.position.b.toFixed(1)}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.7rem',
                                  }}
                                />
                              </Box>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>

                    {/* Smart Scrollbar for Points */}
                    <SmartScrollbar
                      scrollRef={pointsScrollRef}
                      selectedItems={selectedIndices}
                      totalItems={colorPoints.points.length}
                      scrollHeight={pointsScrollHeight}
                      scrollTop={pointsScrollTop}
                      onScrollUpdate={(scrollTop, scrollHeight) => {
                        setPointsScrollTop(scrollTop);
                        setPointsScrollHeight(scrollHeight);
                      }}
                    />
                  </Box>
                )}
              </>
            )}
          </Paper>
        </Box>
      </Box>

      {/* Save Group Dialog */}
      <Dialog
        open={saveGroupDialogOpen}
        onClose={() => setSaveGroupDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Save Group</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Group Name"
              fullWidth
              variant="outlined"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              helperText="Enter a name for this group"
            />
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Ring Color
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {colorOptions.map((option) => (
                  <IconButton
                    key={option.value}
                    onClick={() => setGroupRingColor(option.value)}
                    sx={{
                      width: 40,
                      height: 40,
                      backgroundColor: option.value,
                      border:
                        groupRingColor === option.value
                          ? '3px solid #1976d2'
                          : '1px solid #ccc',
                      '&:hover': {
                        backgroundColor: option.value,
                        opacity: 0.8,
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveGroupDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveGroupConfirm}
            variant="contained"
            disabled={!groupName.trim()}
          >
            Save Group
          </Button>
        </DialogActions>
      </Dialog>

      {/* Save Average Point Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Average Point</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Save the average of {selectedIndices.length} selected points
          </Typography>
          {averagePoint && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2">Average Values:</Typography>
              <Typography variant="body2">
                {`L: ${averagePoint.position.L.toFixed(2)}, a: ${averagePoint.position.a.toFixed(2)}, b: ${averagePoint.position.b.toFixed(2)}`}
              </Typography>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}
              >
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    backgroundColor: averagePoint.color,
                    border: '1px solid #ccc',
                    borderRadius: '50%',
                  }}
                />
                <Typography variant="body2" color="text.secondary">
                  {averagePoint.color}
                </Typography>
              </Box>
            </Box>
          )}
          <TextField
            margin="dense"
            label="Point Name"
            fullWidth
            variant="outlined"
            value={averagePointName}
            onChange={(e) => setAveragePointName(e.target.value)}
            helperText="Enter a name for this average point"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveConfirm}
            variant="contained"
            disabled={!averagePointName.trim()}
          >
            Save Point
          </Button>
        </DialogActions>
      </Dialog>

      {/* PCA Results Dialog */}
      <Dialog
        open={showPCADialog}
        onClose={() => setShowPCADialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Principal Component Analysis Results
          <IconButton
            aria-label="close"
            onClick={() => setShowPCADialog(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            ×
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {pcaResults && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Selected Points: {selectedIndices.length}
              </Typography>

              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Center Point (Mean):
              </Typography>
              <Box sx={{ mb: 2, pl: 2 }}>
                <Typography variant="body2">
                  L*: {pcaResults.center.L.toFixed(3)}
                </Typography>
                <Typography variant="body2">
                  a*: {pcaResults.center.a.toFixed(3)}
                </Typography>
                <Typography variant="body2">
                  b*: {pcaResults.center.b.toFixed(3)}
                </Typography>
              </Box>

              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Principal Components:
              </Typography>
              {pcaResults.components.map((component, index) => (
                <Box key={index} sx={{ mb: 2, pl: 2 }}>
                  <Typography
                    variant="subtitle2"
                    color={['error', 'success', 'primary'][index]}
                  >
                    PC{index + 1} (
                    {pcaResults.explainedVariance[index].toFixed(1)}% variance)
                  </Typography>
                  <Typography variant="body2" sx={{ pl: 1 }}>
                    Eigenvalue: {component.eigenvalue.toFixed(3)}
                  </Typography>
                  <Typography variant="body2" sx={{ pl: 1 }}>
                    L* loading: {component.L.toFixed(3)}
                  </Typography>
                  <Typography variant="body2" sx={{ pl: 1 }}>
                    a* loading: {component.a.toFixed(3)}
                  </Typography>
                  <Typography variant="body2" sx={{ pl: 1 }}>
                    b* loading: {component.b.toFixed(3)}
                  </Typography>
                </Box>
              ))}

              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Statistics:
              </Typography>
              <Box sx={{ mb: 2, pl: 2 }}>
                <Typography variant="body2">
                  Total Variance Explained:{' '}
                  {pcaResults.totalVarianceExplained.toFixed(1)}%
                </Typography>
                <Typography variant="body2">
                  Sum of Eigenvalues: {pcaResults.totalVariance.toFixed(3)}
                </Typography>
                <Typography variant="body2">
                  Number of Points: {selectedIndices.length}
                </Typography>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => setShowPCAAxes(!showPCAAxes)}
                  sx={{ mr: 1 }}
                >
                  {showPCAAxes ? 'Hide' : 'Show'} PCA Axes in 3D
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => console.log('PCA Results:', pcaResults)}
                >
                  Log to Console
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPCADialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Backward compatibility export
export const colorPointsDisplay = ColorPointsDisplay;
