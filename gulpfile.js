var gulp = require('gulp');
var polybuild = require('polybuild');

gulp.task('build', function() {
    return gulp.src('./moe.html')
        .pipe(polybuild({maximumCrush: true}))
        .pipe(gulp.dest('./dist'))
});