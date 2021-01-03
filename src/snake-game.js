(function ($) {
    "use strict";

    function SnakeGame(config) {
        this.init(config);
    }

    SnakeGame.prototype = {

        constructor: SnakeGame,

        init: function(config) {
            $.extend(this, config);
        },

        el: null,
        elId: '',
        cols: 50,
        rows: 50,
        cell: 10,
        speed: 100,
        cornerFood: true,
        wallFood: true,

        /**
         * onPoint
         * 
         * Called with the point increase.
         */
        onPoint: null,

        /**
         * onGameOver
         * 
         * Called when the game ends.
         */
        onGameOver: null,

        /**
         * startLength
         * 
         * Starting length of the snake.
         */
        startLength: 1,
        
        /**
         * snakeColor
         * 
         * The color of the snake
         */
        snakeColor: 'blue',
        
        /**
         * foodColor
         * 
         * The color of the food
         */
        foodColor: 'red',

        /* snake-specific properties. */
        direction: 'right',
        nextDirection: 'right',

        snakeBody: [], /* an array of grid points. */
        food: {}, /* a dictionary of grid points. */
        timeOut: null,
        keyH: null,

        keyHandler: function(e) {
            switch(e.which) {
                case 37: // left
                    if (this.direction !== 'right') {
                        this.nextDirection = 'left';                        
                    }
                    break;
                case 38: // up
                    if (this.direction !== 'down') {
                        this.nextDirection = 'up';
                    }
                    break;
                case 39: // right
                    if (this.direction !== 'left') {
                        this.nextDirection = 'right';
                    }
                    break;
                case 40: // down
                    if (this.direction !== 'up') {
                        this.nextDirection = 'down';
                    }
                    break;
                default: return; // exit this handler for other keys
            }
            e.preventDefault(); // prevent the default action (scroll / move caret)
        },
        
        /**
         * buildIt
         * 
         * Draw the game board.
         */
        buildIt: function() {
            var el = this.el;
            var baseId = this.elId;
            
            /* build the paintbox. */
            el.paintbox({interactive: false,
                         rows: this.rows,
                         cols: this.cols});
        },

        /**
         * createSnake
         * 
         * Create the snake and draw it.
         */
        createSnake: function() {
            var j = 0;
            for (j = 0; j < this.startLength; j++) {
                this.snakeBody.unshift({i: 0, j: j}); /* so that [0] is the head */
            }

            var l = {i: 0,
                     j: 0,
                     color: this.snakeColor,
                     direction: 'right',
                     length: this.startLength};
            this.el.paintbox('line', l);
        },

        /**
         * checkFood
         * 
         * Check if this position has food.
         */
        checkFood: function(newI, newJ) {
            if (this.food[newI + ',' + newJ]) {
                return true;
            }
            return false;
        },

        /**
         * checkCollision
         * 
         * Check if the position is invalid (hit a current part of the snake or
         * an edge).
         */
        checkCollision: function(newI, newJ) {
            var collided = false;
            $.each(this.snakeBody, function(index, element) {
                if (element.i == newI && element.j == newJ) {
                    collided = true;
                }
            });
            
            if (newI < 0 || newI >= this.rows) {
                collided = true;
            }
            if (newJ < 0 || newJ >= this.cols) {
                collided = true;
            }
            
            return collided;
        },

        /**
         * createFood
         * 
         * Create {n} food items on the board.
         */
        createFood: function(n) {
            /* randomly choose where to place the food, for each request and
             * verify it's not in the snake.
             */
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
            var getRandomInt = function(min, max) {
                return Math.floor(Math.random() * (max - min)) + min;
            }

            var x = 0;
            while (x < n) {
                var i = getRandomInt(0, this.rows);
                var j = getRandomInt(0, this.cols);

                var alreadyFood = this.checkFood(i, j);
                var inSnake = this.checkCollision(i, j); // needlessly checks the walls.
                
                if (!alreadyFood && !inSnake) {
                    /* walls, 0, cols-1, 0, rows-1 */
                    var rMax = this.rows - 1;
                    var cMax = this.cols - 1;

                    /* if we don't allow the food to be along the wall. */
                    if (!this.wallFood) {
                        if (i == 0 || j == 0 || i == rMax || j == cMax) {
                            break;
                        }
                    }

                    /* if we don't allow the food to be in a corner;
                     * in theory we could allow walls and not corners, so
                     * we need this check which is technicaly handled above
                     */
                    if (!this.cornerFood) {
                        if ((i == 0 && j == 0) || (i == rMax && j == 0) ||
                            (i == 0 && j == cMax) || (i == rMax && j == cMax)) {
                            break;
                        }
                    }
                    
                    this.food[i + ',' + j] = 1;
                    this.el.paintbox('cell', {i: i, j: j, color: this.foodColor});

                    x += 1;
                }
            }
        },

        /**
         * gameOver
         * 
         * The game is over, handle it.
         */
        gameOver: function() {
            clearTimeout(this.timeOut);
            this.timeOut = null;
            var curr = this.snakeBody[0];
            
            this.el.paintbox('cell', {i: curr.i, j: curr.j, color: 'white'});
            this.el.paintbox('fill', {i: curr.i, j: curr.j, color: 'black'});
            
            if (this.onGameOver) {
                this.onGameOver();
            }
        },

        /**
         * moveSnake
         * 
         * Move the snake one step each time it's called based on its current
         * direction.
         * 
         * If you click "reset" it runs next in the queue, but if the interval
         * timer goes off before it the reset has a chance to cancel it, then
         * it will have queued this function to run after reset with the old
         * scope.
         */
        moveSnake: function() {
            var instance = this;
            var curr = instance.snakeBody[0];
            var ni, nj;

            /* update direction if necessary. */
            if (instance.direction !== instance.nextDirection) {
                instance.direction = instance.nextDirection;
            }

            if (instance.direction === 'right') {
                ni = curr.i;
                nj = curr.j + 1;
            } else if (instance.direction === 'left') {
                ni = curr.i;
                nj = curr.j - 1;
            } else if (instance.direction === 'up') {
                ni = curr.i - 1;
                nj = curr.j;
            } else {
                /* down */
                ni = curr.i + 1;
                nj = curr.j;
            }
            
            /* it's moved, check if it's collided or eaten food. */
            if (instance.checkCollision(ni, nj)) {
                return instance.gameOver();
            }

            /* if eating something, turn on head at new location, don't change
             * tail.
             */
            if (instance.checkFood(ni, nj)) {                
                delete instance.food[ni + ',' + nj];

                instance.snakeBody.unshift({i: ni, j: nj});
                instance.el.paintbox('cell', {i: ni, j: nj, color: instance.snakeColor});

                if (Object.keys(instance.food).length == 0) {
                    instance.createFood(2);
                }
                
                if (instance.onPoint) {
                    instance.onPoint(1);
                }
            } else {
                /* just turn off tail, and turn on head at new location. */
                var t = instance.snakeBody.pop();
                instance.el.paintbox('cell', {i: t.i, j: t.j, color: 'white'});

                instance.snakeBody.unshift({i: ni, j: nj});
                instance.el.paintbox('cell', {i: ni, j: nj, color: instance.snakeColor});
            }

            return;
        },

        /**
         * clearGameBoard
         * 
         * Clear the gameboard pieces.
         */
        clearGameBoard: function() {
            var i, j;
            for (i = 0; i < this.rows; i++) {
                for (j = 0; j < this.cols; j++) {
                    this.el.paintbox('cell', {i: i, j: j, color: 'white'});
                }
            }

            return;
        },

        /**
         * resetSystem
         * 
         * Reset the system.
         */
        resetSystem: function() {
            if (this.timeOut) {
                clearTimeout(this.timeOut);
                this.timeOut = null;
            }

            $(document).unbind('keydown', this.keyH);

            this.direction = 'right';
            this.nextDirection = 'right';

            while (this.snakeBody.pop());

            var crumbs = Object.keys(this.food);
            var f;
            for (f = 0; f < crumbs.length; f++) {
                delete this.food[crumbs[f]];
            }

            this.clearGameBoard();
        },
    }

    /**
     * Set up a snakegame.
     * 
     * @param configOrCommand - Config object or command name
     *     Example: { ... };
     *     you may set any public property (see above);
     *
     * @param commandArgument - Some commands (like 'increment') may require an 
     *     argument
     */
    $.fn.snakeGame = function(configOrCommand, commandArgument) {
        var dataName = 'snakegame';

        /**
         * enableGame
         * 
         * Enable the game itself.  I haven't fully determined why this can't
         * live in the prototype.
         */
        var enableGame = function(instance) {
            /* clear the game board if from a previous game. */
            instance.resetSystem();

            /* draw the snake. */
            instance.createSnake();

            /* set the direction */
            instance.direction = 'right'; // default.

            /* draw the food. */
            instance.createFood(2);

            /* enable arrow keys */
            instance.keyH = function(event) {
                instance.keyHandler(event);
            }
            
            $(document).keydown(instance.keyH);

            /* start the snake moving. */
            instance.timeOut = setInterval(function() {
                instance.moveSnake();
            }, instance.speed);
        };

        if (typeof configOrCommand == 'string') {
            if (configOrCommand === 'start') {
                /* you want to update this here in case they call it a lot. */
                return this.each(function() {
                    var instance = $(this).data(dataName);
                    enableGame(instance);
                });
            } else if (configOrCommand === 'turn') {
                return this.each(function() {
                    var instance = $(this).data(dataName);
                    var nd = commandArgument;

                    if (nd === 'left') {
                        if (instance.direction !== 'right') {
                            instance.nextDirection = nd;                        
                        }                        
                    } else if (nd === 'up') {
                        if (instance.direction !== 'down') {
                            instance.nextDirection = nd;
                        }
                    } else if (nd === 'right') {
                        if (instance.direction !== 'left') {
                            instance.nextDirection = nd;
                        }
                    } else if (nd === 'down') {
                        if (instance.direction !== 'up') {
                            instance.nextDirection = nd;
                        }
                    }
                });
            }
        }

        return this.each(function() {
            var el = $(this), instance = el.data(dataName),
                config = $.isPlainObject(configOrCommand) ? configOrCommand : {};

            /* XXX: Ensure that the area specified is "large enough" to play */
            if (instance) {
                instance.init(config); 
                instance.buildIt(instance);
            } else {
                var initialConfig = $.extend({}, el.data());
                config = $.extend(initialConfig, config);
                config.el = el;
                config.elId = el.attr('id');
                // throw exception if no ID is set for this.

                instance = new SnakeGame(config);
                el.data(dataName, instance);

                instance.buildIt(instance);
            }
        });
    }
}(jQuery));
