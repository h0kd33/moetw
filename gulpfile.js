var gulp = require('gulp');
var polybuild = require('polybuild');

gulp.task('build', function() {
    return gulp.src('./moe-video/moe-video.html')
        .pipe(polybuild())
        .pipe(gulp.dest('./dist'))
});