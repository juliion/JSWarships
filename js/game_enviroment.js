const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
const squareSize = 30;
const playerMargin = squareSize * 12;
const dxy = squareSize;
const minDistanceToCell = squareSize * Math.sqrt(2) - 5;
const GRID_SIZE = 10; //ConfigManager.getConfig().GridSize;

class Vector2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(another) {
    //this.x += another.x;
    //this.y += another.y;
    return new Vector2(this.x+another.x, this.y+another.y);
  }

  multiply(number) {
    //this.x *= number;
    //this.y *= number;
    return new Vector2(this.x * number, this.y * number);
  }


  static distance(vectorFrom, vectorTo) {
    return Math.sqrt(
      (vectorFrom.x - vectorTo.x) ** 2 + (vectorFrom.y - vectorTo.y) ** 2
    );
  }

  static Up = new Vector2(0, 1);
  static Right = new Vector2(1, 0);
  static Left = new Vector2(-1, 0);
  static Down = new Vector2(0, -1);
  static Directions = [Vector2.Up, Vector2.Left, Vector2.Right, Vector2.Down];
}

const deltaVector = new Vector2(
  canvas.offsetLeft + canvas.clientLeft,
  canvas.offsetTop + canvas.clientTop
);

const checkBounds = (x, y) => {
  if (x < 0 || y < 0) return false;
  return x < GRID_SIZE && y < GRID_SIZE;
};

const CellType = {
  Empty: 0,
  Occupied: 1,
  Blocked: 2,
  Potential: 3,
  Missed: 4,
  Damaged: 5,
};

class Cell {
  constructor(x, y, player) {
    this.position = new Vector2(
      player * playerMargin + x * dxy + deltaVector.x,
      y * dxy + deltaVector.y
    );
    this.localPosition = new Vector2(x, y);
    this.cellType = CellType.Empty;
  }
}

class GameEnviroment {
  static Cells = [[]];
  static Ships = [[]];
  static Player;
  static Bot;
  static GameState;

  static checkLose(player) {
    const filtered = Ships[player].filter((ship) => ship.isAlive);
    return filtered == 0;
  }

  static drawGrid(size) {
    this.clearSea();
    for (let player = 0; player < 2; player++) {
      this.Cells[player] = [];
      for (let i = 0; i < size; i++) {
        this.Cells[player][i] = [];
        for (let j = 0; j < size; j++) {
          this.drawRectangle(new Vector2(i, j), player, 'LightCyan');
          this.Cells[player][i].push(new Cell(i, j, player));
        }
      }
    }
  }

  static getCell(player, position) {
    return this.Cells[player][position.x][position.y];
  }

  static findClickedCell(x, y, player) {
    const mousePos = new Vector2(x, y);
    const cells = this.Cells[player];
    for (let i = 0; i < this.Cells[player].length; i++) {
      for (let j = 0; j < cells[i].length; j++) {
        if (
          Vector2.distance(cells[i][j].position, mousePos) <= minDistanceToCell
        ) {
          return cells[i][j];
        }
      }
    }
    return null;
  }

  static addShip(player, ship) {
    if (!this.Ships[player]) this.Ships[player] = [];
    this.Ships[player].push(ship);
  }

  static drawRectangle = (position, player, color) => {
    ctx.beginPath();
    ctx.fillStyle = 'black';
    ctx.fillRect(
      player * playerMargin + position.x * dxy,
      position.y * dxy,
      squareSize,
      squareSize
    );
    ctx.fillStyle = color;
    ctx.fillRect(
      player * playerMargin + position.x * dxy + 0.5,
      position.y * dxy + 0.5,
      squareSize - 1,
      squareSize - 1
    );
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
  };

  static drawPoint = (position, player, color) => {
    ctx.beginPath();
    ctx.fillStyle = color;
    //ctx.arc(position.x+squareSize/2, position.y+squareSize/2, 1, 0, Math.PI * 2, false);
    ctx.fillRect(
      player * playerMargin + position.x * dxy+squareSize/3,
      position.y * dxy+squareSize/3,
      squareSize/4,
      squareSize/4
    );
    ctx.fill();
    ctx.closePath();
  };

  static drawSea = (player) => {
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        this.drawRectangle(new Vector2(i, j), player, 'LightCyan');
      }
    }
  };

  static addShipCell(cell, player, lastCellPosition) {
    const x = cell.localPosition.x,
      y = cell.localPosition.y;
    this.Cells[player][x][y].cellType = CellType.Occupied;
    if (!lastCellPosition) {
      this.setSquearePotential(cell.localPosition, player);
    } else {
      let differenceVector = new Vector2(
        x - lastCellPosition.x,
        y - lastCellPosition.y
      );
      if (checkBounds(x + differenceVector.x, y + differenceVector.y)) {
        differenceVector = differenceVector.add(cell.localPosition);
        const nextCell = this.getCell(player, differenceVector);
        if (nextCell.cellType === CellType.Empty)
          {
            this.getCell(player, differenceVector).cellType = CellType.Potential;
        }
        
      }
      
      this.surroundCell(x, y, player);
    }
    for (let i = -1; i < 2; i += 2) {
      for (let j = -1; j < 2; j += 2) {
        if (checkBounds(x + i, y + j))
          this.Cells[player][x + i][y + j].cellType = CellType.Blocked;
      }
    }
  }

  static surroundCellBlockPotential(x, y, player) {
    if (this.Cells[player][x][y].cellType === CellType.Occupied) {
      for (let k = -1; k <= 1; k++) {
        for (let m = -1; m <= 1; m++) {
          if (!checkBounds(x + k, y + m)) continue;
          if (this.Cells[player][x + k][y + m].cellType === CellType.Occupied) continue;
          this.Cells[player][x + k][y + m].cellType = CellType.Blocked;
        }
      }
    }
  }

  static surroundCell(x, y, player) {
    for (let k = -1; k <= 1; k++) {
      for (let m = -1; m <= 1; m++) {
        if (!checkBounds(x + k, y + m)) continue;
        const cellType = this.Cells[player][x + k][y + m].cellType;
        if (cellType === CellType.Occupied || cellType === CellType.Potential)
          continue;
        this.Cells[player][x + k][y + m].cellType = CellType.Blocked;
      }
    }
  }

  static refreshSea(player) {
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (this.Cells[player][i][j].cellType === CellType.Occupied) {
          this.surroundCellBlockPotential(i, j, player);
        }
      }
    }
  }

  static isCellBlocked(cell) {
    return cell.cellType === CellType.Blocked;
  }

  static setSquearePotential(position, player) {
    for(let i = 0; i< Vector2.Directions.length; i++)
    {
      const modedPosition = Vector2.Directions[i].add(position);

      if(checkBounds(modedPosition.x, modedPosition.y))
      {
      const cell = this.getCell(player, modedPosition);
      if(!this.isCellBlocked(cell))
      {
        cell.cellType = CellType.Potential;
      }
    }
    }
  }

  static clearSea = () => {
    ctx.clearRect(0, 0, 700, 300);
  };

  static getShip(x, y, player) {
    const ships = this.Ships[player];
    for (let i = 0; i < ships.length; i++) {
      const ship = ships[i];
      const shipCells = ship.cells;
      for (let j = 0; j < shipCells.length; j++) {
        const cellOfShip = shipCells[j];
        if (
          cellOfShip.localPosition.x === x &&
          cellOfShip.localPosition.y === y
        )
          return ship;
      }
    }
  }

  static miss(cell, player) {
    cell.cellType = CellType.Missed;
    const result = 'Missed';
    this.drawPoint(cell.localPosition, player, 'black');
    
    //рисуем крестик
    //и нолик заодно
    return result;
  }

  static hit(cell, player) {
    let result = 'Damaged';
    cell.cellType = CellType.Damaged;
    result = 'Damaged';
    this.drawRectangle(
      cell.localPosition.x,
      cell.localPosition.y,
      player,
      'red'
    );
    const ship = this.getShip(
      cell.localPosition.x,
      cell.localPosition.y,
      player
    );
    ship.killCell(cell);
    if (!ship.checkAlive()) {
      this.refreshSea(player);
      result = 'Aimed';
    }
    return result;
  }

  static shot(x, y, player) {
    let result;
    const cell = this.Cells[player][x][y];
    console.log(cell.cellType);
    switch (cell.cellType) {
      case CellType.Occupied:
        result = this.hit(cell, player);
        break;
      case CellType.Potential:
      case CellType.Missed:
      case CellType.Damaged:
        result = 'Error';
        break;
      default:
        result = this.miss(cell, player);
        break;
    }
    return result;
  }
}
