module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Project configuration.
    grunt.initConfig({
        jshint: {
            options: {
                eqeqeq: true,
                devel: true,
                globalstrict: true,
                expr: true
            },
            all: ["lib/**/*.js"]
        },

         watch: {
            jshint: {
                tasks: ["jshint:all"],
                files: ["lib/**/*.js"]
            }
        }
    });
};
