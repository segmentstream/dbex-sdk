var fs = require('fs');

module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        eslint: {
            options: {
                configFile: '.eslintrc',
            },
            target: ['src/dbex.js']
        },
        uglify: {
            options: {
                compress: true,
                report: 'gzip'
            },
            build: {
                files: {
                    'build/dbex.js': ['src/dbex.js'],
                    'dist/dbex.min.js': ['src/dbex.js']
                }
            }
        },
        compress: {
            build: {
                options: {
                    mode: 'gzip'
                },
                expand: true,
                cwd: 'build',
                src: ['**/*'],
                dest: 'build/'
            }
        },
        clean: {
            pre_build: ['build', 'dist']
        },
        aws: grunt.file.readJSON('aws-keys.json'),
        aws_s3: {
            options: {
                accessKeyId: '<%= aws.AWSAccessKeyId %>', // Use the variables
                secretAccessKey: '<%= aws.AWSSecretKey %>', // You can also use env variables
                region: 'eu-west-1',
                params: {
                    CacheControl: 'max-age=86400',
                    ContentEncoding: 'gzip'
                }
            },
            staging: {
                options: {
                    bucket: 'cdn.driveback.ru',
                    differential: true, // Only uploads the files that have changed
                    gzipRename: 'ext' // when uploading a gz file, keep the original extension
                },
                files: [
                    {
                        expand: true,
                        cwd: 'build',
                        src: ['**'],
                        dest: 'js/'
                    }
                ]
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-aws-s3');
    grunt.loadNpmTasks('grunt-eslint');

    // Default task(s).
    grunt.registerTask('build', [
        'eslint',
        'clean:pre_build',
        'uglify',
        'compress',
        'aws_s3'
    ]);
};
