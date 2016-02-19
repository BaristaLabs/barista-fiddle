var gulp = require('gulp');
var runSequence = require('run-sequence');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');

gulp.task('compress-acorn', function () {

    var DEST = 'fiddle/components/acorn';

    return gulp.src('node_modules/acorn/dist/*.js')
        .pipe(gulp.dest(DEST))
        .pipe(uglify())
        .pipe(rename({ extname: '.min.js' }))
        .pipe(gulp.dest(DEST));
});

gulp.task('compress-tern', function () {

    var DEST = 'fiddle/components/tern';

    return gulp.src(['node_modules/tern/lib/*.js']) //TODO: Maybe include plugins...
        .pipe(gulp.dest(DEST))
        .pipe(uglify())
        .pipe(rename({ extname: '.min.js' }))
        .pipe(gulp.dest(DEST));
});

gulp.task('compress', function (callback) {
    runSequence(
        'compress-acorn',
        'compress-tern',
        function (error) {
            if (error) {
                console.log(error.message);
            } else {
                console.log('COMPRESS Completed');
            }
            callback(error);
        });
});