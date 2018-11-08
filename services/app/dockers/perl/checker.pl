use strict;
use warnings;
require "./solution.pl";

while(<>){
    my $JSON=$_;
    $JSON=~s/:/=>/g;
    my $PERL=eval $JSON;
    if (exists $PERL->{check}){
        last;
    }
    my $args = $PERL->{arguments};
    my $exp = $PERL->{expected};
    print solution(@$args) == $exp;
}