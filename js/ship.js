class Ship {
  constructor(size) {
    this.cells = [];
    this.size = size;
    this.isAlive = true;
  }

  addCell(cell) {
    this.cells.push(cell);
  }

  getCell(cellPosition) {
    for (const shipCell in this.cells) {
      if (
        shipCell.localPosition.x === cellPosition.x &&
        shipCell.localPosition.y === cellPosition.y
      ) {
        return shipCell;
      }
    }
  }

  checkAlive() {
    const filtered = this.cells.filter(
      (shipCell) => shipCell.cellType !== CellType.Damaged
    );
    return filtered.length > 0;
  }

  killCell(cell) {
    cell.cellType = CellType.Damaged;
    this.isAlive = this.checkAlive();
  }

  getCellType(cellPosition) {
    return this.getCell(cellPosition).cellType;
  }
}

//module.exports = Ship;
