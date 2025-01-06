const container = document.getElementById('cube-container');

const instructions = document.createElement('div');
instructions.textContent = "Instructions : R=Layer selection from right; F=Layer selection from front; T=Layer selection from top; A= Anticlockwise turn of selected layer; C= Clockwise turn of selected layer. Press arrow keys to change camera angle.";
instructions.style.position = 'absolute';
instructions.style.bottom = '10px';
instructions.style.left = '10px';
instructions.style.color = 'white';
instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
instructions.style.padding = '10px';
instructions.style.borderRadius = '5px';
document.body.appendChild(instructions);

const slider = document.createElement('input');
slider.type = 'range';
slider.min = '2';
slider.max = '5';
slider.value = '3';
slider.style.position = 'absolute';
slider.style.top = '10px';
slider.style.left = '10px';
document.body.appendChild(slider);

const sliderLabel = document.createElement('div');
sliderLabel.textContent = `Cube Size: ${slider.value}`;
sliderLabel.style.position = 'absolute';
sliderLabel.style.top = '40px';
sliderLabel.style.left = '10px';
sliderLabel.style.color = 'white';
document.body.appendChild(sliderLabel);

const solveButton = document.createElement('button');
solveButton.textContent = 'Solve';
solveButton.style.position = 'absolute';
solveButton.style.top = '70px';
solveButton.style.left = '10px';
solveButton.style.padding = '10px';
solveButton.style.backgroundColor = '#ff5722';
solveButton.style.color = 'white';
solveButton.style.border = 'none';
solveButton.style.borderRadius = '5px';
solveButton.style.cursor = 'pointer';
document.body.appendChild(solveButton);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

camera.position.set(6, 6, 8);
camera.lookAt(0, 0, 0);


const colors = {
    F: 0xffa500, 
    B: 0xff0000, 
    L: 0x00ff00, 
    R: 0x0000ff, 
    T: 0xffffff, 
    D: 0xffff00  
};

let N = parseInt(slider.value, 10); 
let cubeState = []; 
let cubeGroup = new THREE.Group();

let selectedLayer = null;
let selectedFace = null;
let clickCount = 0;
let lastClickTime = 0;

const EPSILON = 0.01; 
const originalColors = new Map();

let faceMapping = {
    F: new THREE.Vector3(0, 0, 1),  
    B: new THREE.Vector3(0, 0, -1), 
    L: new THREE.Vector3(-1, 0, 0), 
    R: new THREE.Vector3(1, 0, 0),  
    T: new THREE.Vector3(0, 1, 0),  
    D: new THREE.Vector3(0, -1, 0)  
};

function generateEvenIndexes(N) {
    const indexes = [];
    for (let i = -(N - 1)/2; i <= (N - 1)/2; i += 1) {
        indexes.push(-i);
    }
    return indexes;
}

function getLayerIndex(clickCount, N) {
    if (N % 2 === 0) {
        const indexes = generateEvenIndexes(N);
        return indexes[(clickCount - 1) % indexes.length];
    } else {
        return Math.floor(N / 2) - (clickCount - 1);
    }
}

function updateFaceMapping(axis, clockwise) {
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix[`makeRotation${axis.toUpperCase()}`](clockwise ? Math.PI / 2 : -Math.PI / 2);

    Object.keys(faceMapping).forEach(face => {
        faceMapping[face].applyMatrix4(rotationMatrix);
    });
}

const arrowGroup = new THREE.Group();

function createArrow(direction, color) {
    const length = 6;
    return new THREE.ArrowHelper(direction.clone(), new THREE.Vector3(0, 0, 0), length, color, 1, 0.7);
}

const arrows = {
    R: createArrow(faceMapping.R, 0x0000ff), 
    T: createArrow(faceMapping.T, 0xffffff), 
    F: createArrow(faceMapping.F, 0xffa500) 
};

Object.values(arrows).forEach(arrow => arrowGroup.add(arrow));
scene.add(arrowGroup);

function updateArrows() {
    arrows.R.setDirection(faceMapping.R.clone());
    arrows.T.setDirection(faceMapping.T.clone());
    arrows.F.setDirection(faceMapping.F.clone());
}

function initializeCubeState() {
    cubeState = Array.from({ length: N }, () =>
        Array.from({ length: N }, () =>
            Array.from({ length: N }, () => ({
                F: colors.F,
                B: colors.B,
                L: colors.L,
                R: colors.R,
                T: colors.T,
                D: colors.D
            }))
        )
    );
}

function createPiece(x, y, z, faceColors) {
    const geometry = new THREE.BoxGeometry(0.95, 0.95, 0.95);
    const materials = [
        new THREE.MeshBasicMaterial({ color: faceColors.R }),
        new THREE.MeshBasicMaterial({ color: faceColors.L }),
        new THREE.MeshBasicMaterial({ color: faceColors.T }),
        new THREE.MeshBasicMaterial({ color: faceColors.D }),
        new THREE.MeshBasicMaterial({ color: faceColors.F }),
        new THREE.MeshBasicMaterial({ color: faceColors.B })
    ];

    const cubePiece = new THREE.Mesh(geometry, materials);
    cubePiece.position.set(x, y, z);

    originalColors.set(cubePiece.id, materials.map(mat => mat.color.clone()));

    return cubePiece;
}

function generateCube() {
    scene.remove(cubeGroup);
    cubeGroup = new THREE.Group();
    initializeCubeState();

    const offset = (N - 1) / 2;
    for (let x = 0; x < N; x++) {
        for (let y = 0; y < N; y++) {
            for (let z = 0; z < N; z++) {
                const piece = createPiece(x - offset, y - offset, z - offset, cubeState[x][y][z]);
                cubeGroup.add(piece);
            }
        }
    }
    scene.add(cubeGroup);
}

slider.addEventListener('input', () => {
    N = parseInt(slider.value, 10);
    sliderLabel.textContent = `Cube Size: ${slider.value}`;
    generateCube();
});

function highlightLayer() {
    cubeGroup.children.forEach(cube => {
        const position = cube.position;
        const isSelected = selectedLayer !== null && selectedFace !== null;
        const isHighlighted =
            (selectedFace === 'F' && Math.abs((position.z) - selectedLayer) < EPSILON) ||
            (selectedFace === 'B' && Math.abs((position.z) + selectedLayer) < EPSILON) ||
            (selectedFace === 'L' && Math.abs((position.x) + selectedLayer) < EPSILON) ||
            (selectedFace === 'R' && Math.abs((position.x) - selectedLayer) < EPSILON) ||
            (selectedFace === 'T' && Math.abs((position.y) - selectedLayer) < EPSILON) ||
            (selectedFace === 'D' && Math.abs((position.y) + selectedLayer) < EPSILON);

        cube.material.forEach((mat, i) => {
            mat.color.copy(originalColors.get(cube.id)[i]);
        });

        if (isSelected && isHighlighted) {
            cube.material.forEach(mat => {
                mat.color.lerp(new THREE.Color(0x000000), 0.2); 
            });
        }
    });
}

function handleLayerSelection(face) {
    if (selectedFace === face ) {
        clickCount = (clickCount % N) + 1;
    } else {
        selectedFace = face;
        clickCount = 1;
    }

    selectedLayer = getLayerIndex(clickCount, N); 

    highlightLayer(); 
}

function rotateCube(axis, clockwise) {
    const angle = clockwise ? Math.PI / 2 : -Math.PI / 2;
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix[`makeRotation${axis.toUpperCase()}`](angle);
    cubeGroup.applyMatrix4(rotationMatrix);

    updateFaceMapping(axis, clockwise);
    updateArrows();
}

function rotateFaceColors(faceColors, axis, clockwise) {
    const newColors = { ...faceColors };

    if (axis === 'x') {
        if (clockwise) {
            newColors.T = faceColors.F;
            newColors.F = faceColors.D;
            newColors.D = faceColors.B;
            newColors.B = faceColors.T;
        } else {
            newColors.T = faceColors.B;
            newColors.B = faceColors.D;
            newColors.D = faceColors.F;
            newColors.F = faceColors.T;
        }
    } else if (axis === 'y') {
        if (clockwise) {
            newColors.F = faceColors.L;
            newColors.L = faceColors.B;
            newColors.B = faceColors.R;
            newColors.R = faceColors.F;
        } else {
            newColors.F = faceColors.R;
            newColors.R = faceColors.B;
            newColors.B = faceColors.L;
            newColors.L = faceColors.F;
        }
    } else if (axis === 'z') {
        if (clockwise) {
            newColors.T = faceColors.R;
            newColors.R = faceColors.D;
            newColors.D = faceColors.L;
            newColors.L = faceColors.T;
        } else {
            newColors.T = faceColors.L;
            newColors.L = faceColors.D;
            newColors.D = faceColors.R;
            newColors.R = faceColors.T;
        }
    }

    return newColors;
}


function updateCubeMaterials(cube, colors) {
    cube.material.forEach((material, index) => {
        material.color.setHex(colors[index]);
    });
}

function rotateLayerInState(state, face, layer, direction) {
    const axisMap = { F: 'z', B: 'z', L: 'x', R: 'x', T: 'y', D: 'y' };
    const axis = axisMap[face];
    const angle = direction === 'cw' ? Math.PI / 2 : -Math.PI / 2;

    const offset = (N - 1) / 2; 
    const rotationMatrix = new THREE.Matrix4();

    if (axis === 'x') rotationMatrix.makeRotationX(angle);
    if (axis === 'y') rotationMatrix.makeRotationY(angle);
    if (axis === 'z') rotationMatrix.makeRotationZ(angle);
    const newState = JSON.parse(JSON.stringify(state));

    for (let x = 0; x < N; x++) {
        for (let y = 0; y < N; y++) {
            for (let z = 0; z < N; z++) {
                const position = new THREE.Vector3(x - offset, y - offset, z - offset);

                if (
                    (axis === 'x' && Math.abs(position.x - (layer - offset)) < EPSILON) ||
                    (axis === 'y' && Math.abs(position.y - (layer - offset)) < EPSILON) ||
                    (axis === 'z' && Math.abs(position.z - (layer - offset)) < EPSILON)
                ) {
                    position.applyMatrix4(rotationMatrix);
                    const newX = Math.round(position.x + offset);
                    const newY = Math.round(position.y + offset);
                    const newZ = Math.round(position.z + offset);
                    const newColors = rotateFaceColors(state[x][y][z], axis, direction);
                    newState[newX][newY][newZ] = newColors;
                }
            }
        }
    }

    return newState; 
}

function rotateSelectedLayer(clockwise) {
    if (!selectedFace || selectedLayer === null) return;

    const axisMap = { F: 'z', B: 'z', L: 'x', R: 'x', T: 'y', D: 'y' };
    const axis = axisMap[selectedFace];
    const angle = clockwise ? Math.PI / 2 : -Math.PI / 2;

    const layerCubes = cubeGroup.children.filter(cube => {
        const position = cube.position;
        return (
            (selectedFace === 'F' && Math.abs(position.z - selectedLayer) < EPSILON) ||
            (selectedFace === 'B' && Math.abs(position.z + selectedLayer) < EPSILON) ||
            (selectedFace === 'L' && Math.abs(position.x + selectedLayer) < EPSILON) ||
            (selectedFace === 'R' && Math.abs(position.x - selectedLayer) < EPSILON) ||
            (selectedFace === 'T' && Math.abs(position.y - selectedLayer) < EPSILON) ||
            (selectedFace === 'D' && Math.abs(position.y + selectedLayer) < EPSILON)
        );
    });

    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix[`makeRotation${axis.toUpperCase()}`](angle);

    layerCubes.forEach(cube => {
        cube.applyMatrix4(rotationMatrix);
    });

    updateLogicalState(layerCubes, axis, clockwise);
}


function updateLogicalState(layerCubes, axis, clockwise) {
    const offset = (N - 1) / 2;
    const tempState = JSON.parse(JSON.stringify(cubeState));

    layerCubes.forEach(cube => {
        const { x, y, z } = cube.position.clone().addScalar(offset).round();
        const currentColors = cubeState[x][y][z];

        const newPosition = new THREE.Vector3(x - offset, y - offset, z - offset);
        newPosition.applyMatrix4(new THREE.Matrix4()[`makeRotation${axis.toUpperCase()}`](clockwise ? Math.PI / 2 : -Math.PI / 2));
        const newX = Math.round(newPosition.x + offset);
        const newY = Math.round(newPosition.y + offset);
        const newZ = Math.round(newPosition.z + offset);

        tempState[newX][newY][newZ] = rotateFaceColors(currentColors, axis, clockwise);
    });

    cubeState = tempState;
}

function deselectLayer() {
    selectedLayer = null;
    selectedFace = null;
    highlightLayer();
}

document.addEventListener('keydown', event => {
    switch (event.key.toUpperCase()) {
        case 'ARROWUP':
            rotateCube('x', true);
            break;
        case 'ARROWDOWN':
            rotateCube('x', false);
            break;
        case 'ARROWLEFT':
            rotateCube('y', true);
            break;
        case 'ARROWRIGHT':
            rotateCube('y', false);
            break;

        case 'F':
        case 'R':
        case 'T':
            handleLayerSelection(event.key.toUpperCase());
            break;

        case 'C': 
            rotateSelectedLayer(true);
            break;

        case 'A': 
            rotateSelectedLayer(false);
            break;

        case 'ESCAPE':
            deselectLayer();
            break;
    }
});

function solveCubeUsingIDAStar(cubeState, maxDepth = 100) {
    const directions = ['cw', 'ccw'];
    const faces = ['F', 'R', 'T'];
    
    function dissimilarityHeuristic(state) {
        let mismatchScore = 0;
        const edgeWeight = 8;
        const cornerWeight = 1;
        const centerWeight = 96 * (N - 2) + 8;
    
        for (let x = 0; x < N; x++) {
            for (let y = 0; y < N; y++) {
                for (let z = 0; z < N; z++) {
                    const currentPiece = state[x][y][z];
                    const solvedPiece = getSolvedPieceAt(x, y, z);
    
                    if (!arePiecesEqual(currentPiece, solvedPiece)) {
                        const isCorner = (x === 0 || x === N - 1) && (y === 0 || y === N - 1) && (z === 0 || z === N - 1);
                        const isEdge =
                            (x === 0 || x === N - 1) +
                            (y === 0 || y === N - 1) +
                            (z === 0 || z === N - 1) === 2;
                        const isCenter = !isCorner && !isEdge;
    
                        if (isCorner) mismatchScore += cornerWeight;
                        else if (isEdge) mismatchScore += edgeWeight;
                        else if (isCenter) mismatchScore += centerWeight;
                    }
                }
            }
        }
    
        return mismatchScore;
    }
    
    function rotateLayerInState2(state, face, layer, direction) {
        const axisMap = { F: 'z', B: 'z', L: 'x', R: 'x', T: 'y', D: 'y' };
        const axis = axisMap[face];
        const angle = direction === 'cw' ? Math.PI / 2 : -Math.PI / 2;
        const offset = (N - 1) / 2;
    
        const rotationMatrix = new THREE.Matrix4();
        if (axis === 'x') rotationMatrix.makeRotationX(angle);
        if (axis === 'y') rotationMatrix.makeRotationY(angle);
        if (axis === 'z') rotationMatrix.makeRotationZ(angle);
    
        const updatedState = Array.from({ length: N }, () =>
            Array.from({ length: N }, () =>
                Array.from({ length: N }, () => null)
            )
        );
    
        for (let x = 0; x < N; x++) {
            for (let y = 0; y < N; y++) {
                for (let z = 0; z < N; z++) {
                    const position = new THREE.Vector3(x - offset, y - offset, z - offset);
                    if (
                        (axis === 'x' && Math.abs(position.x - (layer - offset)) < EPSILON) ||
                        (axis === 'y' && Math.abs(position.y - (layer - offset)) < EPSILON) ||
                        (axis === 'z' && Math.abs(position.z - (layer - offset)) < EPSILON)
                    ) {
                        position.applyMatrix4(rotationMatrix); 
                        const newX = Math.round(position.x + offset);
                        const newY = Math.round(position.y + offset);
                        const newZ = Math.round(position.z + offset);
                        const newCube = rotateFaceColors(state[x][y][z], axis, direction);
                        updatedState[newX][newY][newZ] = newCube;
                    } else {
                        updatedState[x][y][z] = state[x][y][z];
                    }
                }
            }
        }
    
        return updatedState;
    }
    
    
    function rotateFaceColors(cube, axis, direction) {
        const newCube = { ...cube };
        const clockwise = direction === 'cw';
    
        if (axis === 'x') {
            if (clockwise) {
                newCube.T = cube.F;
                newCube.F = cube.D;
                newCube.D = cube.B;
                newCube.B = cube.T;
            } else {
                newCube.T = cube.B;
                newCube.B = cube.D;
                newCube.D = cube.F;
                newCube.F = cube.T;
            }
        } else if (axis === 'y') {
            if (clockwise) {
                newCube.F = cube.L;
                newCube.L = cube.B;
                newCube.B = cube.R;
                newCube.R = cube.F;
            } else {
                newCube.F = cube.R;
                newCube.R = cube.B;
                newCube.B = cube.L;
                newCube.L = cube.F;
            }
        } else if (axis === 'z') {
            if (clockwise) {
                newCube.T = cube.R;
                newCube.R = cube.D;
                newCube.D = cube.L;
                newCube.L = cube.T;
            } else {
                newCube.T = cube.L;
                newCube.L = cube.D;
                newCube.D = cube.R;
                newCube.R = cube.T;
            }
        }
    
        return newCube;
    }
    

    function applyMoveLocal(state, face, layer, direction) {
        let newState = JSON.parse(JSON.stringify(state));
        newState = rotateLayerInState2(newState, face, layer, direction);
        return newState;
    }

    function getSolvedPieceAt(x, y, z) {
        const solvedPiece = {};
    
        const offset = (N - 1) / 2;
    
        solvedPiece.F = colors.F; 
        solvedPiece.B = colors.B;   
        solvedPiece.L = colors.L;    
        solvedPiece.R = colors.R; 
        solvedPiece.T = colors.T; 
        solvedPiece.D = colors.D;    
    
        return solvedPiece;
    }
    
    function arePiecesEqual(piece1, piece2) {
        return Object.keys(piece1).every(face => piece1[face] === piece2[face]);
    }
    
    function idaStarSearch(state, depth, g, path, visited, queue) {
        const h = dissimilarityHeuristic(state);
        let front = 0;
        let diff = depth == Math.min(N-1,2) ? 1 : depth == Math.min(N,3) ? 8 : 96 * (N - 2);
        let rear = 0;
        queue.push([state, h, path, 0]);
        rear++;
        if (h==0) return [queue[0], visited]; 
        while(front < rear && queue[front][3] < depth + 1) {
            let dStateElement = queue[front];
            front++;
            let dState = dStateElement[0];
            let dStateCost = dStateElement[1];
            let dStatePath = dStateElement[2];
            let dStateDepth = dStateElement[3];
            for (const face of faces) {
                for (let layer = 0; layer < N; layer++) {
                    for (const direction of directions) {

                        const nextState = applyMoveLocal(dState, face, layer, direction);
                        const nextMove = { face, layer, turn: direction };

                        const stateHash = JSON.stringify(nextState);
                        if (visited.has(stateHash)) continue;
                        let hState = dissimilarityHeuristic(nextState);
                        
                        let hPath = dStatePath.concat(nextMove);
                        let hDepth = dStateDepth + 1;
                        if (hState == 0) return [[nextState, hState, hPath, hDepth], visited, queue];
                        if (hState <= h - depth) queue.push([nextState, hState, hPath, hDepth]);
                        rear++;
                    }
                }
            }
            visited.add(JSON.stringify(dState));
        }    
        let answer = queue[0];
        let nextQueue = [];
        queue.forEach((item) => {
            if (item[1] < answer[1]){
                answer = item;
            }
        });
        queue.forEach((item) => {
            if (item[1] <= Math.max(0, h - diff)) {
                nextQueue.push([item[0], item[1], item[2], 0]);
            }
        })
        queue = [];
        nextQueue.sort((a,b) => a[1] - b[1]);
        return [answer, visited, nextQueue];
    }

    function iterativeDeepening(state) {
        let depth = 0;
        let path = [];
        let visited = new Set();
        let updatedState = state;
        let queue = [];
        let performance = dissimilarityHeuristic(state);
        let diff = performance <= 8 ? Math.min(N, 4) : performance <= 96 * (N - 2) ? Math.min(N , 3) : Math.min( N - 1 ,2 );
        while (depth <= maxDepth) {
            const result = idaStarSearch(updatedState, diff, 0, path, visited, queue);

            if (result[0][1] === 0) return result[0][2];
            if (result === Infinity) break;
            if (depth > maxDepth) break;
            queue = result[2];
            performance = result[0][1];
            updatedState = result[0][0];
            diff = performance <= 8 ? 4 : performance <= 96 * (N - 2) ? 3 : 2;
            path = result[0][2];
            visited = new Set();
            depth++;
        }

        return null; 
    }

    const initialState = JSON.parse(JSON.stringify(cubeState)); 

    return iterativeDeepening(initialState);
}


function visualizeSolutionSteps(steps) {
    let stepIndex = 0;

    function applyNextStep() {
        if (stepIndex >= steps.length) return;

        const { face, layer, turn } = steps[stepIndex];

        selectedFace = face;
        clickCount = N - layer;
        selectedLayer = getLayerIndex(clickCount, N);
        rotateSelectedLayer(turn === 'cw');
        deselectLayer();

        stepIndex++;
        setTimeout(applyNextStep, 1250);
    }

    applyNextStep(); 
}

let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

container.addEventListener('mousedown', event => {
    isDragging = true;
    previousMousePosition = { x: event.clientX, y: event.clientY };
});

container.addEventListener('mousemove', event => {
    if (isDragging) {
        const deltaMove = {
            x: event.clientX - previousMousePosition.x,
            y: event.clientY - previousMousePosition.y
        };

        camera.position.x -= deltaMove.x * 0.01;
        camera.position.y += deltaMove.y * 0.01;

        camera.lookAt(0, 0, 0);
        previousMousePosition = { x: event.clientX, y: event.clientY };
    }
});

container.addEventListener('mouseup', () => {
    isDragging = false;
});

generateCube();
solveButton.addEventListener('click', async () => {
    deselectLayer();
    const solutionSteps = await solveCubeUsingIDAStar(cubeState);
    if (solutionSteps) {
        visualizeSolutionSteps(solutionSteps);
    } else {
        alert('Solution could not be found within the depth limit.');
    }
});

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();
