use strict;
use warnings;
use JSON::MaybeXS qw(encode_json decode_json); 
require "./check/solution.pl";

$SIG{__DIE__} = sub {print "{\"status\":\"error\", \"result\":\"unexpected\"}\n"; exit 1;};
$SIG{__WARN__} = sub {print "{\"status\":\"error\", \"result\":\"unexpected\"}\n"; exit 1;};

while(<>){
    my $JSON=$_;
    my $PERL = decode_json $JSON;
    if (exists $PERL->{check}){
        print "{\"status\":\"ok\", \"result\" : \"" . $PERL->{check} . "\"}\n";
        last;
    }
    my $args = $PERL->{arguments};
    my $exp = $PERL->{expected};
    if (solution(@$args) != $exp) {
        print "{\"status\":\"failure\", \"result\":" . encode_json($PERL->{arguments}) . "}\n";
        last;
    }
}

