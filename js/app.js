/**
 * Created by Daniel Cohen <dcohenb@gmail.com> on 3/9/2015.
 */
var app = angular.module('todoApp', ['ngResource', 'ui.router', 'angularMoment']);

/**
 * Default app configurations, cleanup angular debug stuff and setup the application states (routes)
 */
app.config(function ($stateProvider, $urlRouterProvider) {
    // Application states
    $stateProvider
        .state('tasks', {
            url: "/tasks",
            templateUrl: "partials/tasks.html",
            controller: "TasksCtrl"
        })
        .state('addTask', {
            url: "/task/create",
            templateUrl: "partials/addTask.html",
            controller: "AddTaskCtrl"
        })
        .state('editTask', {
            url: "/task/:id/edit",
            templateUrl: "partials/editTask.html",
            controller: "EditTaskCtrl"
        });

    // Default state
    $urlRouterProvider.otherwise("/tasks");
});

/**
 * dueDate Filter
 * Used for hover over the clock to get a nice estimation of the time left for that task
 * Example: Due in 03/10/2015 00:00 (in 2 hours)
 */
app.filter('dueDate', function () {
    return function (date) {
        var m = moment(date);
        return 'Due in ' + m.format('MM/DD/YYYY hh:mm A') + ' (' + m.fromNow() + ')';
    }
});

/**
 * tasks service is used to store and manipulate the tasks in the local storage
 */
app.factory('tasks', function () {
    /**
     * Used to setup the new user experience
     */
    function init() {
        // New user! setup default task for example
        if (!localStorage.tasks) {
            add({
                description: 'My First Task!',
                assignee: 'Me',
                due_date: moment().add(1, 'hour').startOf('minute').toDate()
            });
        }
    }

    /**
     * Get all the tasks from the localStorage, return empty array if nothing is available
     * @returns {Array}
     */
    function getAll() {
        var tasks = [];
        try {
            tasks = JSON.parse(localStorage.tasks);
            tasks.forEach(function (task) {
                task.due_date = new Date(task.due_date); // Convert timestamp back to Date Object
            });
        } catch (e) {
        }
        return tasks;
    }

    /**
     * Get a specific task by index
     * @param index
     * @returns {task}
     */
    function get(index) {
        return getAll()[index];
    }

    /**
     * Create a new task and store it
     * converts the date object to timestamp and marks as not completed by default
     * @param task
     */
    function add(task) {
        task.completed = false;
        var tasks = getAll();
        tasks.push(task);
        save(tasks);
    }

    /**
     * Update given task in the given index
     * @param task
     * @param index
     */
    function edit(task, index) {
        var tasks = getAll();
        tasks[index] = task;
        save(tasks);
    }

    /**
     * Remove a task from storage based on a given index
     * @param index
     */
    function remove(index) {
        var tasks = getAll();
        tasks.splice(index, 1);
        save(tasks);
    }

    /**
     * Save an array of given tasks to the localStorage as a JSON string
     * @param tasks
     */
    function save(tasks) {
        tasks.forEach(function (task) {
            task.due_date = new Date(task.due_date).getTime(); // Save as timestamp
        });
        localStorage.tasks = JSON.stringify(angular.copy(tasks));
    }

    init();

    return {
        getAll: getAll,
        save: save,
        get: get,
        add: add,
        edit: edit,
        remove: remove
    }
});

/**
 * assignees service is used to declare the getAll method of the resource
 * for the list of possible assignees on tasks
 */
app.factory('assignees', function ($resource) {
    var Assignees = $resource('resources/assignees.json', {}, {
        getAll: {
            method: 'GET',
            isArray: true
        }
    });
    return Assignees;
});

/**
 * The main view controller, show all the tasks, watch tasks checks and save if changes occur
 */
app.controller('TasksCtrl', function ($scope, $state, tasks) {
    // Get all the tasks
    $scope.tasks = tasks.getAll();

    // Watch and save check/uncheck of tasks
    $scope.$watch('tasks', function () {
        tasks.save($scope.tasks);
    }, true);

    /**
     * Check if a given date is already due
     * @returns {boolean}
     */
    $scope.dateDue = function (date) {
        return date < new Date();
    };

    // Edit Task handler - Get the task index and redirect to edit state
    $scope.editTask = function (task) {
        var taskIndex = $scope.tasks.indexOf(task);
        $state.go('editTask', {id: taskIndex});
    };

    /**
     * Remove task handler
     * @param task
     */
    $scope.removeTask = function (task) {
        if (confirm('Would you like to remove this task?')) {
            var taskIndex = $scope.tasks.indexOf(task);
            tasks.remove(taskIndex);
            $scope.tasks.splice(taskIndex, 1);
        }
    };
});

/**
 * Create a default task and load up the list of possible assignees
 */
app.controller('AddTaskCtrl', function ($scope, $state, tasks, assignees) {
    // Default task values
    $scope.task = {
        due_date: moment().add(1, 'days').startOf('minute').toDate()
    };

    // Get all available assignees & update the selected task assignee
    assignees.getAll().$promise.then(function (results) {
        $scope.assignees = results;
        $scope.task.assignee = $scope.assignees[0];
    });

    // Handle submit, save changes and go back to the main view
    $scope.submitHandler = function () {
        tasks.add($scope.task);
        $state.go('tasks');
    };
});

/**
 * Get a task edit it and store it
 */
app.controller('EditTaskCtrl', function ($scope, $state, $stateParams, tasks, assignees) {
    // Get the task
    $scope.task = tasks.get($stateParams.id);

    // Get all available assignees
    assignees.getAll().$promise.then(function (results) {
        $scope.assignees = results;
    });

    // Handle submit, save changes and go back to the main view
    $scope.submitHandler = function () {
        tasks.edit($scope.task, $stateParams.id);
        $state.go('tasks');
    };
});